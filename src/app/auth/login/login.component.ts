// src/app/auth/login/login.component.ts

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }     from '@angular/material/input';
import { MatButtonModule }    from '@angular/material/button';
import { MatIconModule }      from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Location }           from '@angular/common';

import { AuthService }       from '../../core/auth.service';
import { SupabaseService }   from '../../core/supabase.service';
import { ErrorService }      from '../../core/error.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';

  quickUsers = [
    { email: 'paciente@paciente.com',  password: '123456', role: 'paciente 1',      img: 'assets/perfiles/paciente1.jpg' },
    { email: 'paciente2@paciente.com', password: '123456', role: 'paciente 2',      img: 'assets/perfiles/paciente2.jpg' },
    { email: 'paciente3@paciente.com', password: '123456', role: 'paciente 3',      img: 'assets/perfiles/paciente3.jpg' },
    { email: 'especialista1@especialista.com', password: '123456', role: 'especialista 1', img: 'assets/perfiles/especialista1.jpg' },
    { email: 'especialista2@especialista.com', password: '123456', role: 'especialista 2', img: 'assets/perfiles/especialista2.jpg' },
    { email: 'admin@admin.com',        password: '123456', role: 'admin',           img: 'assets/perfiles/admin.jpg' }
  ];

  constructor(
    private fb:       FormBuilder,
    private auth:     AuthService,
    private supa:     SupabaseService,
    private errorSvc: ErrorService,
    private router:   Router,
    private location: Location
  ) {}

  ngOnInit() {
      
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
    
  }

  usarUsuario(usr: any) {
    this.form.patchValue({
      email: usr.email,
      password: usr.password
    });
  }

  goBack(): void {
    this.location.back();
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;

    try {
      // 1️⃣ Intento de login vía AuthService (incluye logging)
      const { user } = await this.auth.signIn(
        email.trim().toLowerCase(),
        password
      );

      // 2️⃣ Verificar email
      if (!user.email_confirmed_at) {
        this.errorMessage = this.errorSvc.translate({ message: 'Email not confirmed' });
        await this.auth.signOut();
        this.loading = false;
        return;
      }

      // 3️⃣ Traer perfil
      const { data: profile, error: errProfile } = await this.supa
        .from('profiles')
        .select('role,approved')
        .eq('user_id', user.id)
        .single();

      if (errProfile || !profile) {
        this.errorMessage = this.errorSvc.translate(errProfile ?? { message: 'No se pudo obtener el perfil de usuario.' });
        this.loading = false;
        return;
      }

      // 4️⃣ Validar especialista
      if (profile.role === 'especialista' && !profile.approved) {
        this.errorMessage = 'Tu cuenta de especialista está pendiente de aprobación.';
        await this.auth.signOut();
        this.loading = false;
        return;
      }

      // 5️⃣ Redirigir
      this.loading = false;
      switch (profile.role) {
        case 'admin':
          this.router.navigateByUrl('/admin/users');
          break;
        case 'especialista':
          this.router.navigateByUrl('/especialista/mis-turnos');
          break;
        default:
          this.router.navigateByUrl('/paciente/mis-turnos');
      }

    } catch (err: any) {
      // Capturamos el error de signIn o insert a login_logs
      this.errorMessage = this.errorSvc.translate(err);
      console.error('Login falla o insert log falla:', err);
      this.loading = false;
    }
  }
}
