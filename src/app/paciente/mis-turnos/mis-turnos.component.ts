// src/app/paciente/mis-turnos/mis-turnos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule }    from '@angular/material/table';
import { MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { RouterModule }      from '@angular/router';

import { SupabaseService }   from '../../core/supabase.service';
import { AuthService }       from '../../core/auth.service';
import { Turno }             from '../../models/turno.model';
import { Location }          from '@angular/common';
import { MatDialog }         from '@angular/material/dialog';
import { CancelarTurnoDialogComponent } from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';
import { VerResenaDialogComponent } from '../../turnos/ver-resena-dialog/ver-resena-dialog.component';
import { EncuestaDialogComponent } from '../../turnos/encuesta-dialog/encuesta-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; 
import { MatDialogModule } from '@angular/material/dialog';

interface Perfil {
  user_id:  string;
  nombre:   string;
  apellido: string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    RouterModule
  ],
  selector: 'app-mis-turnos-paciente',
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss']
})
export class MisTurnosPacienteComponent implements OnInit {
  filterCtrl = new FormControl('');
  displayedColumns = [
    'fecha',
    'hora',
    'especialidad',
    'especialista',
    'estado',
    'acciones'
  ];
  dataSource: Turno[] = [];

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private location: Location,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

 async ngOnInit() {
    await this.loadTurnos();
    this.filterCtrl.valueChanges.subscribe(term => {
      const t = (term || '').toLowerCase().trim();
      this.dataSource = this.dataSource.filter(turno =>
        turno.especialidad.toLowerCase().includes(t) ||
        `${turno.especialista.nombre} ${turno.especialista.apellido}`
          .toLowerCase()
          .includes(t)
      );
    });
  }

  private async loadTurnos() {
    const user = await this.auth.currentUser();
    if (!user) return;

    // 1) Obtener turnos del paciente
    const { data: rawTurnos, error } = await this.supa
      .from('turnos')
      .select('id,fecha,hora,especialidad,especialista_id,estado,comentario_especialista,comentario_paciente')
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false });
    if (error || !rawTurnos) {
      console.error('Error fetching turnos:', error);
      return;
    }

    // 2) Cargar datos de especialista
    const espIds = Array.from(new Set(rawTurnos.map(r => r.especialista_id)));
    const { data: perfiles, error: err2 } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', espIds);
    if (err2) {
      console.error('Error cargando especialistas:', err2);
      return;
    }
    const mapEsp = new Map(perfiles.map((p: any) => [p.user_id, p]));

    // 3) Mapear
    this.dataSource = (rawTurnos as any[]).map(r => ({
      id:           r.id,
      fecha:        r.fecha,
      hora:         r.hora,
      especialidad: r.especialidad,
      especialista: mapEsp.get(r.especialista_id) || { nombre:'', apellido:'' },
      estado:       r.estado,
      comentario_especialista: r.comentario_especialista,
      comentario_paciente:     r.comentario_paciente
    }));
  }

  // Cancelar turno (si no está realizado)
  cancelar(turno: Turno) {
    if (turno.estado === 'Realizado') return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Cancelado', comentario_paciente: motivo })
        .eq('id', turno.id);
      if (error) this.snack.open('No se pudo cancelar','Cerrar',{duration:3000});
      else {
        this.snack.open('Turno cancelado','Cerrar',{duration:2000});
        this.loadTurnos();
      }
    });
  }

  // Ver reseña del especialista (si existe)
  verResena(turno: Turno) {
      this.dialog.open(VerResenaDialogComponent, {
    data: { comentario: turno.comentario_especialista }
  });
  }

  // Completar encuesta (si especialista ya realizó y dejó reseña, y paciente aún no hizo encuesta)
  completarEncuesta(turno: Turno) {
    if (turno.estado !== 'Realizado' || !turno.comentario_especialista || turno.comentario_paciente) return;
    const ref = this.dialog.open(EncuestaDialogComponent, { data: { turno } });
    ref.afterClosed().subscribe(async texto => {
      if (!texto) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ comentario_paciente: texto })
        .eq('id', turno.id);
      if (error) this.snack.open('No se pudo enviar encuesta','Cerrar',{duration:3000});
      else {
        this.snack.open('Encuesta completada','Cerrar',{duration:2000});
        this.loadTurnos();
      }
    });
  }

  // Calificar Atención (misma lógica que completar encuesta, pero usando otro diálogo)
  calificar(turno: Turno) {
    if (turno.estado !== 'Realizado' || turno.comentario_paciente) return;
    const ref = this.dialog.open(EncuestaDialogComponent, { data: { turno } });
    ref.afterClosed().subscribe(async texto => {
      if (!texto) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ comentario_paciente: texto })
        .eq('id', turno.id);
      if (error) this.snack.open('No se pudo calificar','Cerrar',{duration:3000});
      else {
        this.snack.open('Atención calificada','Cerrar',{duration:2000});
        this.loadTurnos();
      }
    });
  }

  goBack() {
    this.location.back();
  }
}
