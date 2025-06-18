import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule }    from '@angular/material/table';
import { MatFormFieldModule }from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatDialog, MatDialogModule }        from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule }    from '@angular/material/snack-bar';
import { RouterModule }      from '@angular/router';
import { Location }          from '@angular/common';

import { SupabaseService }   from '../../core/supabase.service';
import { AuthService }       from '../../core/auth.service';
import { Turno }             from '../../models/turno.model';
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
  selector: 'app-mis-turnos-especialista',
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
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss']
})
export class MisTurnosEspecialistaComponent implements OnInit {
  filterCtrl = new FormControl('');
  displayedColumns = ['fecha','hora','especialidad','paciente','estado','acciones'];

  /** lista maestra sin filtrar */
  allTurnos: Turno[] = [];
  /** origen real de la tabla */
  dataSource: Turno[] = [];

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  async ngOnInit() {
    await this.loadTurnos();

    this.filterCtrl.valueChanges.subscribe(term => {
      const txt = (term || '').trim().toLowerCase();
      if (!txt) {
        // si limpiaron el filtro, restauramos toda la lista
        this.dataSource = this.allTurnos;
      } else {
        this.dataSource = this.allTurnos.filter(t =>
          t.especialidad.toLowerCase().includes(txt)
          || `${t.paciente?.nombre ?? ''} ${t.paciente?.apellido ?? ''}`.toLowerCase().includes(txt)
        );
      }
    });
  }

  private async loadTurnos() {
    const user = await this.auth.currentUser();
    if (!user) return;

    // 1) traigo sólo campos básicos
    const { data: raw, error } = await this.supa
      .from('turnos')
      .select('id,fecha,hora,especialidad,paciente_id,estado,comentario_especialista,comentario_paciente')
      .eq('especialista_id', user.id)
      .order('fecha', { ascending: false });

    if (error || !raw) {
      console.error('Error cargando turnos:', error);
      return;
    }

    // 2) obtengo los perfiles de los pacientes
    const pacienteIds = Array.from(new Set(raw.map((r: any) => r.paciente_id)));
    const { data: perfData, error: err2 } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', pacienteIds);

    if (err2 || !perfData) {
      console.error('Error cargando perfiles de pacientes:', err2);
      return;
    }
    const perfilMap = new Map<string, Perfil>();
    perfData.forEach(p => perfilMap.set(p.user_id, p));

    // 3) mapeo al modelo Turno (con paciente embebido)
    const mapped = (raw as any[]).map(r => ({
      id:           r.id,
      fecha:        r.fecha,
      hora:         r.hora,
      especialidad: r.especialidad,
      paciente:     perfilMap.get(r.paciente_id)!,
      especialista: { user_id: user.id, nombre: '', apellido: '' }, // no usamos aquí
      estado:       r.estado,
      comentario_especialista: r.comentario_especialista,
      comentario_paciente:     r.comentario_paciente
    }));

    // guardo lista maestra y tabla
    this.allTurnos  = mapped;
    this.dataSource = mapped;
  }

  // -----------------------------
  // ACCIONES SEGÚN ESTADO
  // -----------------------------

  cancelar(t: Turno) {
    if (['Aceptado','Realizado','Rechazado'].includes(t.estado)) return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Cancelado', comentario_especialista: motivo })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo cancelar','Cerrar',{duration:3000});
      } else {
        this.snack.open('Turno cancelado','Cerrar',{duration:2000});
        await this.loadTurnos();
      }
    });
  }

  rechazar(t: Turno) {
    if (['Aceptado','Realizado','Cancelado'].includes(t.estado)) return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Rechazado', comentario_especialista: motivo })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo rechazar','Cerrar',{duration:3000});
      } else {
        this.snack.open('Turno rechazado','Cerrar',{duration:2000});
        await this.loadTurnos();
      }
    });
  }

  aceptar(t: Turno) {
    if (['Realizado','Cancelado','Rechazado'].includes(t.estado)) return;
    this.supa
      .from('turnos')
      .update({ estado: 'Aceptado' })
      .eq('id', t.id)
      .then(({ error }) => {
        if (error) {
          this.snack.open('Error al aceptar','Cerrar',{duration:3000});
        } else {
          this.snack.open('Turno aceptado','Cerrar',{duration:2000});
          this.loadTurnos();
        }
      });
  }

  finalizar(t: Turno) {
    if (t.estado !== 'Aceptado') return;
    const ref = this.dialog.open(EncuestaDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async texto => {
      if (!texto) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Realizado', comentario_especialista: texto })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo finalizar','Cerrar',{duration:3000});
      } else {
        this.snack.open('Turno finalizado','Cerrar',{duration:2000});
        this.loadTurnos();
      }
    });
  }

  verResena(t: Turno) {
    // ahora mostramos la calificación que dejó el paciente
    if (!t.comentario_paciente) return;
    this.dialog.open(VerResenaDialogComponent, {
      data: {
        comentario: t.comentario_paciente,
        title:      'Calificación del Paciente'
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
