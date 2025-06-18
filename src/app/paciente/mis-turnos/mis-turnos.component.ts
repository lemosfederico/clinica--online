import { Component, OnInit }          from '@angular/core';
import { CommonModule }               from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule }             from '@angular/material/table';
import { MatFormFieldModule }         from '@angular/material/form-field';
import { MatInputModule }             from '@angular/material/input';
import { MatButtonModule }            from '@angular/material/button';
import { MatIconModule }              from '@angular/material/icon';
import { RouterModule }               from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Location }                   from '@angular/common';

import { SupabaseService }            from '../../core/supabase.service';
import { AuthService }                from '../../core/auth.service';
import { Turno }                      from '../../models/turno.model';
import { CancelarTurnoDialogComponent } from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';
import { VerResenaDialogComponent }     from '../../turnos/ver-resena-dialog/ver-resena-dialog.component';
import { EncuestaDialogComponent }      from '../../turnos/encuesta-dialog/encuesta-dialog.component';

interface Perfil {
  user_id:  string;
  nombre:   string;
  apellido: string;
}

@Component({
  standalone: true,
  selector:    'app-mis-turnos-paciente',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './mis-turnos.component.html',
  styleUrls:   ['./mis-turnos.component.scss']
})
export class MisTurnosPacienteComponent implements OnInit {
  filterCtrl       = new FormControl('');
  displayedColumns = ['fecha','hora','especialidad','especialista','estado','acciones'];

  /** lista maestra sin filtrar */
  allTurnos: Array<{
    id: string;
    fecha: string;
    hora: string;
    especialidad: string;
    especialista: Perfil;
    estado: string;
    comentario_especialista: string | null;
    comentario_paciente: string | null;
  }> = [];

  /** lista que alimenta la tabla */
  dataSource = this.allTurnos;

  constructor(
    private supa:  SupabaseService,
    private auth:  AuthService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  async ngOnInit() {
    await this.loadTurnos();

    this.filterCtrl.valueChanges.subscribe(term => {
      const txt = (term || '').toLowerCase().trim();
      if (!txt) {
        // si borran todo el filtro, muestro la lista completa
        this.dataSource = this.allTurnos;
      } else {
        this.dataSource = this.allTurnos.filter(turno =>
          turno.especialidad.toLowerCase().includes(txt)
          || `${turno.especialista.nombre} ${turno.especialista.apellido}`.toLowerCase().includes(txt)
        );
      }
    });
  }

  private async loadTurnos() {
    // 1) traer turnos del paciente
    const user = await this.auth.currentUser();
    if (!user) return;

    const { data: raw, error } = await this.supa
      .from('turnos')
      .select('id,fecha,hora,especialidad,especialista_id,estado,comentario_especialista,comentario_paciente')
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false });

    if (error || !raw) {
      console.error('Error trayendo turnos:', error);
      return;
    }

    // 2) cargar datos de los especialistas
    const espIds = Array.from(new Set(raw.map((r: any) => r.especialista_id)));
    const { data: perfEsp, error: err2 } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', espIds);

    if (err2 || !perfEsp) {
      console.error('Error cargando especialistas:', err2);
      return;
    }

    const mapEsp = new Map(perfEsp.map((p: any) => [p.user_id, p]));

    // 3) mapear al formato de tabla
    const mapped = (raw as any[]).map(r => ({
      id: r.id,
      fecha: r.fecha,
      hora: r.hora,
      especialidad: r.especialidad,
      especialista: mapEsp.get(r.especialista_id) || { user_id:'', nombre:'', apellido:'' },
      estado: r.estado,
      comentario_especialista: r.comentario_especialista,
      comentario_paciente: r.comentario_paciente
    }));

    // guardo maestro y muestro
    this.allTurnos  = mapped;
    this.dataSource = mapped;
  }

  cancelar(turno: any) {
    if (turno.estado === 'Realizado') return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      await this.supa
        .from('turnos')
        .update({ estado: 'Cancelado', comentario_paciente: motivo })
        .eq('id', turno.id);
      this.snack.open('Turno cancelado','Cerrar',{ duration: 2000 });
      this.loadTurnos();
    });
  }

  verResena(turno: any) {
    if (!turno.comentario_especialista) return;
    this.dialog.open(VerResenaDialogComponent, {
      data: {
        comentario: turno.comentario_especialista,
        title:      'Reseña del Especialista'
      }
    });
  }
 completarEncuesta(turno: Turno) {
    if (turno.estado !== 'Realizado' 
        || !turno.comentario_especialista 
        || turno.comentario_paciente) return;

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

  calificar(turno: Turno) {
    // mismo guard que completarEncuesta
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
