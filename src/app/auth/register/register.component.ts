// src/app/auth/register/register.component.ts
import { Component }         from '@angular/core';
import { MatButtonModule }   from '@angular/material/button';
import { CommonModule }      from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { Location } from '@angular/common';

 
@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
],
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {


  constructor(public router: Router, private location:Location) {}

  tipoSeleccionado: 'paciente' | 'especialista' | null = null;

  seleccionar(tipo: 'paciente' | 'especialista') {
    this.tipoSeleccionado = tipo;
  }
  goBack(): void {
    this.location.back();
  }

}
