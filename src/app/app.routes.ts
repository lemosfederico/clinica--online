import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent }     from './auth/register/register.component';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';



export const routes: Routes = 
[
  {
    path: '',
    loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    component: RegisterComponent,
    children: 
    [
      { path: 'paciente', loadComponent: () => import('./auth/register/paciente-register/paciente-register.component').then(m => m.PacienteRegisterComponent) },
      { path: 'especialista', loadComponent: () => import('./auth/register/especialista-register/especialista-register.component').then(m => m.EspecialistaRegisterComponent) }
    ]
  },

  {
    path: 'admin/users',
    loadComponent: () => import('./admin/users/users.component').then(m => m.AdminUsersComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' }
  },


  {
    path: 'solicitar-turno',
    loadComponent: () => import('./turnos/solicitar-turno/solicitar-turno.component')
                        .then(m => m.SolicitarTurnoComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: ['paciente','admin'] }
  },

  {
    path: 'paciente/mis-turnos',
    loadComponent: () => import('./paciente/mis-turnos/mis-turnos.component').then(m => m.MisTurnosPacienteComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'paciente' }
  },
  
  {
    path: 'especialista/mis-turnos',
    loadComponent: () => import('./especialista/mis-turnos/mis-turnos.component').then(m => m.MisTurnosEspecialistaComponent),
    canActivate: [authGuard, roleGuard],
    data: { role: 'especialista' }
  },

  {
  path: 'turnos',
  loadComponent: () => import('./turnos/turnos-admin/turnos-admin.component')
                       .then(m => m.TurnosAdminComponent),
  canActivate: [authGuard, roleGuard],
  data: { role: 'admin' }
},

{
  path: 'mi-perfil',
  loadComponent: () => import('./profile/mi-perfil/mi-perfil.component')
                       .then(m => m.MiPerfilComponent),
  canActivate: [authGuard, roleGuard],
  data: { role: 'especialista' }
}


  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class appRoutes { }
