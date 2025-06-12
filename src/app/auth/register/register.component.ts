// src/app/auth/register/register.component.ts
import { Component }         from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule }   from '@angular/material/button';
import { CommonModule }      from '@angular/common';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatButtonModule
  ],
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {}
