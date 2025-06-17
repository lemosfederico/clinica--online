// src/app/turnos/solicitar-turno/solicitar-turno.component.ts
import { Component, OnInit }                  from '@angular/core';
import { CommonModule }                       from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatFormFieldModule }                 from '@angular/material/form-field';
import { MatInputModule }                     from '@angular/material/input';
import { MatSelectModule }                    from '@angular/material/select';
import { MatButtonModule }                    from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule }     from '@angular/material/snack-bar';
import { RouterModule }                       from '@angular/router';

import { SupabaseService }                    from '../../core/supabase.service';
import { AuthService }                        from '../../core/auth.service';

interface Perfil {
  user_id:  string;
  nombre:   string;
  apellido: string;
}

@Component({
  standalone: true,
  selector: 'app-solicitar-turno',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent implements OnInit {
  form: FormGroup;
  specialidades = ['Cardiología','Dermatología','Neurología','Pediatría'];
  especialistas: Perfil[] = [];
  pacientes: Perfil[] = [];
  fechasProximos15: { value: string, label: string }[] = [];
  isAdmin = false;

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private auth: AuthService,
    private snack: MatSnackBar
  ) {
    this.form = this.fb.group({
      paciente:      ['', Validators.required],      // solo admins
      especialidad:  ['', Validators.required],
      especialista:  ['', Validators.required],
      fecha:         ['', Validators.required],
      hora:          ['', [Validators.required]]
    });
  }

  async ngOnInit() {
    // 1) Generar lista de fechas (próximos 15 días)
    const hoy = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      const iso = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString('es-AR', {
        weekday: 'short', day: '2-digit', month: '2-digit'
      });
      this.fechasProximos15.push({ value: iso, label });
    }

    // 2) Cargar especialistas aprobados
    const { data: especs } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .eq('role','especialista')
      .eq('approved', true);
    this.especialistas = especs as Perfil[];

    // 3) Identificar si el user es admin o paciente
    const user = await this.auth.currentUser();
    if (!user) return;
    const { data: me } = await this.supa
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (me?.role === 'admin') {
      this.isAdmin = true;
      // 4) Si es admin, cargar pacientes
      const { data: pats } = await this.supa
        .from('profiles')
        .select('user_id,nombre,apellido')
        .eq('role','paciente');
      this.pacientes = pats as Perfil[];
    } else {
      // paciente normal: fijar paciente en form
      this.form.get('paciente')!.setValue(user.id);
    }
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const user = await this.auth.currentUser();
    if (!user) return;

    const { paciente, especialidad, especialista, fecha, hora } = this.form.value;

    // Insertar turno
    const { error } = await this.supa
      .from('turnos')
      .insert({
        paciente_id:     paciente,
        especialista_id: especialista,
        especialidad,
        fecha,
        hora,
        estado: 'Pendiente'
      });

    if (error) {
      this.snack.open('Error al solicitar turno','Cerrar',{duration:3000});
    } else {
      this.snack.open('Turno solicitado','Cerrar',{duration:2000});
      this.form.reset({ paciente: this.isAdmin ? '' : user!.id });
    }
  }
}
