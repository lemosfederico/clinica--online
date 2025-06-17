// src/app/turnos/turnos-admin/turnos-admin.component.ts
import { Component, OnInit }                         from '@angular/core';
import { CommonModule }                              from '@angular/common';
import { ReactiveFormsModule, FormControl }          from '@angular/forms';
import { MatTableDataSource, MatTableModule }                            from '@angular/material/table';
import { MatFormFieldModule }                        from '@angular/material/form-field';
import { MatInputModule }                            from '@angular/material/input';
import { MatButtonModule }                           from '@angular/material/button';
import { MatIconModule }                             from '@angular/material/icon';
import { MatDialog, MatDialogModule }                from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule }            from '@angular/material/snack-bar';

import { SupabaseService }                           from '../../core/supabase.service';
import { Turno }                                     from '../../models/turno.model';
import { CancelarTurnoDialogComponent }               from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';
import { Location }                                  from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-turnos-admin',
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
  templateUrl: './turnos-admin.component.html',
  styleUrls: ['./turnos-admin.component.scss']
})
export class TurnosAdminComponent implements OnInit {
  displayedColumns = [
    'fecha',
    'hora',
    'especialidad',
    'especialista',
    'paciente',
    'estado',
    'acciones'
  ];
  dataSource = new MatTableDataSource<Turno>([]);
  filterCtrl = new FormControl('');

  constructor(
    private supa: SupabaseService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  async ngOnInit() {
    await this.loadTurnos();

    this.filterCtrl.valueChanges.subscribe(term => {
      this.dataSource.filter = (term || '').trim().toLowerCase();
    });
    this.dataSource.filterPredicate = (row: Turno, filter: string) =>
      row.especialidad.toLowerCase().includes(filter) ||
      `${row.especialista.nombre} ${row.especialista.apellido}`
        .toLowerCase()
        .includes(filter);
  }

  private async loadTurnos() {
    const { data, error } = await this.supa
      .from('turnos')
      .select(`
        id,
        fecha,
        hora,
        especialidad,
        especialista ( nombre, apellido ),
        paciente      ( nombre, apellido ),
        estado
      `)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error cargando turnos admin:', error);
      return;
    }
    this.dataSource.data = data as unknown as Turno[];
  }

  cancelar(t: Turno) {
    // Solo si no está Aceptado, Realizado o Rechazado
    if (['Aceptado','Realizado','Rechazado'].includes(t.estado)) return;

    const ref = this.dialog.open(CancelarTurnoDialogComponent, {
      data: { turno: t }
    });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Cancelado', comentario_paciente: motivo })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo cancelar el turno', 'Cerrar', { duration: 3000 });
      } else {
        this.snack.open('Turno cancelado', 'Cerrar', { duration: 2000 });
        await this.loadTurnos();
      }
    });
  }

        goBack(): void {
    this.location.back();
  }
}
