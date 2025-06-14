import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterComponent }     from './auth/register/register.component';
import { PacienteRegisterComponent }  from './auth/register/paciente-register/paciente-register.component';
import { EspecialistaRegisterComponent } from './auth/register/especialista-register/especialista-register.component';
import { AdminUsersComponent } from './admin/users/users.component';
import { MisTurnosPacienteComponent } from './paciente/mis-turnos/mis-turnos.component';
import { MisTurnosEspecialistaComponent } from './especialista/mis-turnos/mis-turnos.component';
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
    children: [
      //{ path: '', redirectTo: 'paciente', pathMatch: 'full' },
      { path: 'paciente',     component: PacienteRegisterComponent },
      { path: 'especialista', component: EspecialistaRegisterComponent }
    ]
  },

  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' }
  },
  {
    path: 'paciente/mis-turnos',
    component: MisTurnosPacienteComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'paciente' }
  },
  {
    path: 'especialista/mis-turnos',
    component: MisTurnosEspecialistaComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'especialista' }
  },
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class appRoutes { }
