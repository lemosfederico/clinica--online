// src/app/auth/register/paciente-register/paciente-register.component.ts
import { Component, OnInit }            from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router }                       from '@angular/router';
import { CommonModule }                 from '@angular/common';
import { ReactiveFormsModule }          from '@angular/forms';
import { MatFormFieldModule }           from '@angular/material/form-field';
import { MatInputModule }               from '@angular/material/input';
import { MatButtonModule }              from '@angular/material/button';
import { MatIconModule }                from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';

import { SupabaseService } from '../../../core/supabase.service';
import { ErrorService }    from '../../../core/error.service';
import { environment }     from '../../../../environments/environment';

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
  error   = '';   // aquí guardamos el mensaje traducido

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private errorSvc: ErrorService,
    private snack: MatSnackBar,
    private router: Router
  ) {
    this.form = this.fb.group({
      nombre:          ['', [Validators.required, Validators.minLength(3)]],
      apellido:        ['', [Validators.required, Validators.minLength(3)]],
      edad:            [null, [Validators.required, Validators.pattern(/^\d+$/), Validators.min(18), Validators.max(120)]],
      dni:             [null, [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(7), Validators.maxLength(9)]],
      obraSocial:      ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      foto1:           [null, Validators.required],
      foto2:           [null, Validators.required],
      recaptcha:       ['', Validators.required]
    }, {
      validators: grp => {
        const p = grp.get('password')!;
        const c = grp.get('confirmPassword')!;
        return p.value === c.value ? null : { mismatch: true };
      }
    });
  }

  ngOnInit() {}

  onFileChange(event: Event, field: 'foto1' | 'foto2') {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.form.get(field)!.setValue(file);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error   = '';

    const {
      nombre, apellido, edad, dni, obraSocial,
      email, password, foto1, foto2
    } = this.form.value;

    try {
      // ── 1️⃣ Registro en Auth ───────────────────────────────────────
      const { data: signupData, error: signUpError } = await this.supa.signUp(
        email.trim().toLowerCase(),
        password
      );
      if (signUpError || !signupData.user) {
        throw signUpError || new Error('Error al registrar usuario');
      }
      const userId = signupData.user.id;

      // ── 2️⃣ Subir fotos ─────────────────────────────────────────────
      const bucket = this.supa.getStorage().from('avatars');
      const uploadAndGetUrl = async (file: File, fieldName: string): Promise<string> => {
        const ext      = file.name.split('.').pop();
        const filePath = `${userId}/${fieldName}-${Date.now()}.${ext}`;
        const { error: upErr } = await bucket.upload(filePath, file, { upsert: true });
        if (upErr) throw upErr;
        return this.supa.getAvatarPublicUrl(filePath);
      };

      const url1 = await uploadAndGetUrl(foto1 as File, 'foto1');
      const url2 = await uploadAndGetUrl(foto2 as File, 'foto2');

      // ── 3️⃣ Insertar perfil ─────────────────────────────────────────
      const profilePayload = {
        user_id:      userId,
        role:         'paciente',
        nombre,
        apellido,
        edad,
        dni,
        obra_social:  obraSocial,
        approved:     true,
        image_urls:   [url1, url2]
      };

      const { error: profileError } = await this.supa
        .from('profiles')      // o '.from("pacientes")' si tu tabla se llama así
        .insert(profilePayload);
      if (profileError) throw profileError;

      // ── 4️⃣ Todo OK → Redirijo ───────────────────────────────────────
      this.router.navigateByUrl('/login');

    } catch (err: any) {
      // traduce **cualquier** error de Auth, Storage o PostgREST
      const msg = this.errorSvc.translate(err);
      this.error = msg;
      this.snack.open(msg, 'Cerrar', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
