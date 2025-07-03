// src/app/especialista/paciente-detalle/paciente-detalle.component.ts

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule }              from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';
import { MatListModule }             from '@angular/material/list';
import { MatButtonModule }           from '@angular/material/button';
import { MatIconModule }             from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService }           from '../../core/supabase.service';
import { Turno }                     from '../../models/turno.model';
import { VerResenaDialogComponent }  from '../../turnos/ver-resena-dialog/ver-resena-dialog.component';

interface Perfil {
  user_id: string;
  nombre:  string;
  apellido:string;
}

@Component({
  standalone: true,
  selector: 'app-paciente-detalle',
  imports: [
    CommonModule,
    MatDialogModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './paciente-detalle.component.html',
  styleUrls: ['./paciente-detalle.component.scss']
})
export class PacienteDetalleComponent implements OnInit {
  turnos: Turno[] = [];

  constructor(
    private supa:     SupabaseService,
    private dialog:   MatDialog,
    private snack:    MatSnackBar,
    private dialogRef: MatDialogRef<PacienteDetalleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { paciente: Perfil; especialistaId: string }
  ) {}

  async ngOnInit() {
    const { paciente, especialistaId } = this.data;
    const { data } = await this.supa
      .from('turnos')
      .select(`id, fecha, hora, especialidad, comentario_paciente, paciente_id, especialista_id, estado`)
      .eq('paciente_id', paciente.user_id)
      .eq('especialista_id', especialistaId)
      .eq('estado', 'Realizado')
      .order('fecha', { ascending: false });
    this.turnos = data ?? [];
  }

  verResena(t: Turno) {
    if (!t.comentario_paciente) {
      this.snack.open(
        'Aún no cargó la reseña el paciente',
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    this.dialog.open(VerResenaDialogComponent, {
      width: '350px',
      data: {
        comentario: t.comentario_paciente,
        title:      `Reseña de ${this.data.paciente.nombre}`
      },
      autoFocus: false,    // no enfocar el primer input
      restoreFocus: false  // no volver a enfocar el botón que abrí el diálogo
    });
  }

  close() {
    this.dialogRef.close();
  }
}
