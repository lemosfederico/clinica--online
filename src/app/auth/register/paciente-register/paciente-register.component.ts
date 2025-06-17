// src/app/auth/register/paciente-register/paciente-register.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { SupabaseService } from '../../../core/supabase.service';
import { ErrorService } from '../../../core/error.service';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-paciente-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  templateUrl: './paciente-register.component.html',
  styleUrls: ['./paciente-register.component.scss']
})
export class PacienteRegisterComponent implements OnInit {
  siteKey = environment.recaptcha.siteKey;
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private errorSvc: ErrorService,
    private snack: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      apellido: ['', [Validators.required, Validators.minLength(3)]],
      edad: [null, [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(7), Validators.maxLength(9)]],
      obraSocial: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      foto1: [null, Validators.required],
      foto2: [null, Validators.required],
      recaptcha:       ['', Validators.required]    // ≤ nuevo
    }, {
      validators: group => {
        const p = group.get('password')!;
        const c = group.get('confirmPassword')!;
        return p.value === c.value ? null : { mismatch: true };
      }
    });
  }

  ngOnInit() {}

  onFileChange(event: Event, field: 'foto1' | 'foto2') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.form.get(field)!.setValue(file);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';

    const {
      nombre,
      apellido,
      edad,
      dni,
      obraSocial,
      email,
      password,
      foto1,
      foto2
    } = this.form.value;

    try {
      // 1️⃣ Crear usuario en Auth
      const { data: signupData, error: signUpError } = await this.supa.signUp(
        email.trim().toLowerCase(),
        password
      );
      if (signUpError || !signupData.user) {
        throw signUpError || new Error('Error al registrar usuario');
      }
      const userId = signupData.user.id;

      // 2️⃣ Subir fotos al bucket 'perfiles'
      const bucket = this.supa.getStorage().from('avatars');
      const uploadAndGetUrl = async (file: File, fieldName: string) => {
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/${fieldName}-${Date.now()}.${ext}`;
        const { error: uploadError } = await bucket.upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = bucket.getPublicUrl(filePath);
        return this.supa.getAvatarPublicUrl(filePath);
      };

      const url1 = await uploadAndGetUrl(foto1 as File, 'foto1');
      const url2 = await uploadAndGetUrl(foto2 as File, 'foto2');

      // 3️⃣ Insertar perfil en table profiles
      const profilePayload = {
        user_id:    userId,
        role:       'paciente',
        nombre,
        apellido,
        edad,
        dni,
        obra_social: obraSocial,
        approved:   true, // Asumimos que el paciente se aprueba automáticamente
        image_urls: [url1, url2]
      };

      const { error: profileError } = await this.supa.from('profiles').insert(profilePayload);
      if (profileError) throw profileError;

      // 4️⃣ Redirigir
      this.router.navigateByUrl('/login');

    } catch (err: any) {
      const msg = this.errorSvc.translate(err.error || err) || err.message;
      this.snack.open(msg, 'Cerrar', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
