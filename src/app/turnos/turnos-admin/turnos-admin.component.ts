import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Location } from '@angular/common';

import { SupabaseService } from '../../core/supabase.service';
import { CancelarTurnoDialogComponent } from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';

interface Perfil {
  user_id:  string;
  nombre:   string;
  apellido: string;
}

@Component({
  standalone: true,
  selector: 'app-turnos-admin',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './turnos-admin.component.html',
  styleUrls: ['./turnos-admin.component.scss']
})
export class TurnosAdminComponent implements OnInit {
  // filtro de búsqueda
  filterCtrl = new FormControl('');

  // guardamos todos y luego la lista visible
  private allTurnos: Array<{
    id: string;
    fecha: string;
    hora: string;
    especialidad: string;
    especialista: Perfil;
    paciente: Perfil;
    estado: string;
  }> = [];
  dataSource = this.allTurnos;

  displayedColumns = [
    'fecha',
    'hora',
    'especialidad',
    'especialista',
    'paciente',
    'estado',
    'acciones'
  ];

  constructor(
    private supa: SupabaseService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  async ngOnInit() {
    await this.loadTurnos();

    // suscripción al filtro para recargar dataSource
    this.filterCtrl.valueChanges.subscribe(term => {
      const t = (term || '').toLowerCase().trim();
      if (!t) {
        // sin filtro, mostramos todo
        this.dataSource = [...this.allTurnos];
      } else {
        this.dataSource = this.allTurnos.filter(turno =>
          turno.especialidad.toLowerCase().includes(t) ||
          `${turno.especialista.nombre} ${turno.especialista.apellido}`
            .toLowerCase()
            .includes(t)
        );
      }
    });
  }

  private async loadTurnos() {
    // 1) Traer todos los turnos
    const { data: raw, error } = await this.supa
      .from('turnos')
      .select('id,fecha,hora,especialidad,especialista_id,paciente_id,estado')
      .order('fecha', { ascending: false });

    if (error || !raw) {
      console.error('Error cargando turnos:', error);
      return;
    }

    // 2) Sacar listas únicas de IDs para perfiles
    const espIds = Array.from(new Set(raw.map((r: any) => r.especialista_id)));
    const patIds = Array.from(new Set(raw.map((r: any) => r.paciente_id)));

    // 3) Traer perfiles de especialistas y pacientes
    const { data: perfEsps } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', espIds);

    const { data: perfPats } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', patIds);

    const mapEsp = new Map((perfEsps || []).map((p: any) => [p.user_id, p]));
    const mapPat = new Map((perfPats || []).map((p: any) => [p.user_id, p]));

    // 4) Mapear al array que usa la tabla
    this.allTurnos = (raw as any[]).map(r => ({
      id:           r.id,
      fecha:        r.fecha,
      hora:         r.hora,
      especialidad: r.especialidad,
      especialista: mapEsp.get(r.especialista_id) || { user_id: '', nombre: '', apellido: '' },
      paciente:     mapPat.get(r.paciente_id)     || { user_id: '', nombre: '', apellido: '' },
      estado:       r.estado
    }));

    // 5) Inicializar vista
    this.dataSource = [...this.allTurnos];
  }

  cancelar(turno: any) {
    // sólo si está pendiente
    if (turno.estado !== 'Pendiente') return;

    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      // actualizamos estado y guardamos el comentario en el campo de paciente
      const { error } = await this.supa
        .from('turnos')
        .update({
          estado: 'Cancelado',
          comentario_paciente: motivo
        })
        .eq('id', turno.id);

      if (error) {
        this.snack.open('No se pudo cancelar el turno', 'Cerrar', { duration: 3000 });
      } else {
        this.snack.open('Turno cancelado', 'Cerrar', { duration: 2000 });
        await this.loadTurnos();
      }
    });
  }

  goBack() {
    this.location.back();
  }
}
