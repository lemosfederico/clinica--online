// src/app/app.routes.ts

import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent }    from './auth/register/register.component';
import { authGuard }            from './core/auth.guard';
import { roleGuard }            from './core/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./welcome/welcome.component').then(m => m.WelcomeComponent),
    data: { animation: 'Welcome' }
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent),
    data: { animation: 'Login' }
  },
  {
    path: 'register',
    component: RegisterComponent,
    data: { animation: 'Register' },
    children: [
      {
        path: 'paciente',
        loadComponent: () =>
          import('./auth/register/paciente-register/paciente-register.component')
            .then(m => m.PacienteRegisterComponent),
        data: { animation: 'RegisterPaciente' }
      },
      {
        path: 'especialista',
        loadComponent: () =>
          import('./auth/register/especialista-register/especialista-register.component')
            .then(m => m.EspecialistaRegisterComponent),
        data: { animation: 'RegisterEspecialista' }
      }
    ]
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./admin/users/users.component').then(m => m.AdminUsersComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin', animation: 'AdminUsers' }
  },
  {
    path: 'turnos',
    loadComponent: () =>
      import('./turnos/turnos-admin/turnos-admin.component').then(m => m.TurnosAdminComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin', animation: 'TurnosAdmin' }
  },
  {
    path: 'solicitar-turno',
    loadComponent: () =>
      import('./turnos/solicitar-turno/solicitar-turno.component')
        .then(m => m.SolicitarTurnoComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: ['paciente','admin'], animation: 'SolicitarTurno' }
  },
  {
    path: 'paciente/mis-turnos',
    loadComponent: () =>
      import('./paciente/mis-turnos/mis-turnos.component')
        .then(m => m.MisTurnosPacienteComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'paciente', animation: 'MisTurnosPaciente' }
  },
  {
    path: 'especialista/mis-turnos',
    loadComponent: () =>
      import('./especialista/mis-turnos/mis-turnos.component')
        .then(m => m.MisTurnosEspecialistaComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'especialista', animation: 'MisTurnosEspecialista' }
  },
  {
    path: 'mi-perfil',
    loadComponent: () =>
      import('./profile/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'especialista', animation: 'MiPerfilEspecialista' }
  },
  {
    path: 'paciente/historia-clinica',
    loadComponent: () =>
      import('./paciente/historia-clinica/historia-clinica').then(m => m.MiPerfilPacienteComponent),
    data: { animation: 'HistoriaPaciente' }
  },
  {
    path: 'especialista/historia-clinica/:turnoId',
    loadComponent: () =>
      import('./especialista/historia-clinica-form/historia-clinica-form.component')
        .then(m => m.HistoriaClinicaFormComponent),
    data: { animation: 'HistoriaEspecialista' }
  },

  {
    path: 'admin/estadisticas',
    loadComponent: () =>
      import('./admin/stats/stats.component').then(m => m.AdminStatsComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin', animation: 'AdminStats' }
  },
  // ruta comodín opcional
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutesModule {}
