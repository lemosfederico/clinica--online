// src/app/auth/register/paciente-register/paciente-register.component.ts
import { Component, OnInit }       from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router }                  from '@angular/router';
import { SupabaseService }         from '../../../core/supabase.service';
import { ReactiveFormsModule }     from '@angular/forms';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatInputModule }          from '@angular/material/input';
import { MatButtonModule }         from '@angular/material/button';
import { CommonModule }            from '@angular/common';

@Component({
  selector: 'app-paciente-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './paciente-register.component.html',
  styleUrls: ['./paciente-register.component.scss']
})
export class PacienteRegisterComponent implements OnInit {
  loading = false;
  error   = '';

  form = this.fb.group({
    nombre:          ['', [Validators.required, Validators.minLength(3)]],
    apellido:        ['', [Validators.required, Validators.minLength(3)]],
    edad:            [null, [Validators.required, Validators.min(1)]],
    dni:             ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
    obraSocial:      ['', [Validators.required]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    foto1:           [null, Validators.required],
    foto2:           [null, Validators.required],
  }, {
    validators: group => {
      const p = group.get('password')!;
      const c = group.get('confirmPassword')!;
      return p.value === c.value ? null : { mismatch: true };
    }
  });

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {}

  onFileChange(evt: any, field: 'foto1' | 'foto2') {
    const file = evt.target.files?.[0] ?? null;
    this.form.get(field)!.setValue(file);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';

    const {
      nombre, apellido, edad, dni,
      obraSocial, email, password, foto1, foto2
    } = this.form.value;

    // 1. Crear usuario en Auth
    const { data, error } = await this.supa.signUp(email!, password!);
    if (error || !data.user) {
      this.error = error?.message || 'Error al registrar usuario';
      this.loading = false;
      return;
    }
    const userId = data.user.id;

    // 2. Subir fotos al bucket 'perfiles'
    const bucket = this.supa.getStorage().from('perfiles');
    const paths = await Promise.all(
      ['foto1','foto2'].map(async (f, i) => {
        const file = this.form.value[f as 'foto1' | 'foto2'] as unknown as File;
        if (!file) throw new Error(`No file provided for ${f}`);
        const ext = file.name.split('.').pop();
        const filePath = `${userId}/${f}-${Date.now()}.${ext}`;
        await bucket.upload(filePath, file);
        const { data: { publicUrl } } = bucket.getPublicUrl(filePath);
        return publicUrl;
      })
    );

    // 3. Insertar perfil en tabla profiles
    const { data: insertData, error: err2 } = await this.supa
      .from('profiles')
      .insert([{
        user_id:     userId,
        role:        'paciente',
        nombre,
        apellido,
        edad,
        dni,
        obra_social: obraSocial,
        image_urls:  paths
      }]);

    if (err2) {
      this.error = err2.message;
      this.loading = false;
      return;
    }

    // 4. Redirigir a login
    this.loading = false;
    this.router.navigateByUrl('/login');
  }
}
