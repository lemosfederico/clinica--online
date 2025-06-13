// src/app/auth/login/login.component.ts
import { Component, OnInit }          from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink }         from '@angular/router';
import { CommonModule }               from '@angular/common';
import { MatFormFieldModule }         from '@angular/material/form-field';
import { MatInputModule }             from '@angular/material/input';
import { MatButtonModule }            from '@angular/material/button';
import { SupabaseService }            from '../../core/supabase.service';
import { MatIconModule }              from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Location } from '@angular/common';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private router: Router,
    private location: Location
  ) {}

   goBack(): void {
    this.location.back();
  }

  ngOnInit() {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    // Intento de login
    const { data, error } = await this.supa.signIn(email, password);
    if (error) {
      // Throttling u otros errores
      if (error.message.includes('security')) {
        this.errorMessage = 'Por seguridad, espera unos segundos antes de reintentar.';
      } else {
        this.errorMessage = error.message;
      }
      this.loading = false;
      return;
    }

    const user = data.user;
    // 1) Verificar email confirmado
    if (!user?.confirmed_at) {
      this.errorMessage = 'Debes confirmar tu correo antes de ingresar.';
      await this.supa.signOut();
      this.loading = false;
      return;
    }

    const { data: profile, error: errProfile } = await this.supa
      .from('profiles')
      .select('role,approved')
      .eq('user_id', user.id)
      .single();

    if (errProfile || !profile) {
      this.errorMessage = 'No se pudo obtener el perfil de usuario.';
      this.loading = false;
      return;
    }


    const { role, approved } = profile;
    // 3) Si es especialista, debe estar aprobado
    if (role === 'especialista' && !approved) {
      this.errorMessage = 'Tu cuenta de especialista está pendiente de aprobación.';
      await this.supa.signOut();
      this.loading = false;
      return;
    }

    // 4) Redirigir según rol
    this.loading = false;
    if (role === 'admin') {
      this.router.navigateByUrl('/admin/users');
    } else if (role === 'especialista') {
      this.router.navigateByUrl('/especialista/mis-turnos');
    } else {
      this.router.navigateByUrl('/paciente/mis-turnos');
    }
  }

  // Accesos rápidos
  quickLogin(email: string, pass: string) {
    this.form.setValue({ email, password: pass });
    this.onSubmit();
  }
}
