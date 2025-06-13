// src/app/auth/register/register.component.ts
import { Component }         from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButtonModule }   from '@angular/material/button';
import { CommonModule }      from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    MatButtonModule,
    MatIconModule
  ],
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {}
