// src/app/turnos/mis-turnos-paciente/mis-turnos.component.ts

import { Component, OnInit }              from '@angular/core';
import { CommonModule }                   from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource }  from '@angular/material/table';
import { MatFormFieldModule }             from '@angular/material/form-field';
import { MatInputModule }                 from '@angular/material/input';
import { MatButtonModule }                from '@angular/material/button';
import { MatIconModule }                  from '@angular/material/icon';
import { Router, RouterModule }           from '@angular/router';
import { MatDialog, MatDialogModule }     from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Location }                       from '@angular/common';

import { SupabaseService }   from '../../core/supabase.service';
import { AuthService }       from '../../core/auth.service';
import { Turno }             from '../../models/turno.model';


import { CancelarTurnoDialogComponent } from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';
import { VerResenaDialogComponent }     from '../../turnos/ver-resena-dialog/ver-resena-dialog.component';
import { EncuestaDialogComponent }      from '../../turnos/encuesta-dialog/encuesta-dialog.component';

import jsPDF     from 'jspdf';
import html2canvas from 'html2canvas';

interface Perfil { user_id: string; nombre: string; apellido: string; }

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
  displayedColumns = [
    'fecha','hora','especialidad','especialista','estado','historia','acciones'
  ];
  dataSource!: MatTableDataSource<any>;

  // Lista de profesionales con al menos un turno realizado
  profesionalesAtendidos: Perfil[] = [];
  private userId = '';

  constructor(
    private supa:      SupabaseService,
    private auth:      AuthService,
    private dialog:    MatDialog,
    private snack:     MatSnackBar,
    private location:  Location,
    private router:    Router
  ) {}

  async ngOnInit() {
    await this.loadTurnos();
    // Filtro por searchText
    this.dataSource.filterPredicate = (row, filter) =>
      row.searchText.includes(filter);
    this.filterCtrl.valueChanges.subscribe(term => {
      this.dataSource.filter = (term || '').toLowerCase().trim();
    });
  }

  private async loadTurnos() {
    const user = await this.auth.currentUser();
    if (!user) return;
    this.userId = user.id;

    // 1) Traer turnos del paciente
    const { data: rawTurnos, error: errT } = await this.supa
      .from('turnos')
      .select(`
        id, fecha, hora, especialidad,
        especialista_id, estado,
        comentario_especialista,
        comentario_paciente
      `)
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false });
    if (errT || !rawTurnos) {
      this.snack.open('Error al cargar turnos','Cerrar',{duration:3000});
      return;
    }

    // 2) Traer historias
    const turnoIds = rawTurnos.map(r => r.id);
    const { data: historias } = await this.supa
      .from('historia_clinica')
      .select(`turno_id, altura, peso, temperatura, presion, historia_detalles(clave,valor)`)
      .in('turno_id', turnoIds);
    const mapHist = new Map<number, any>((historias ?? []).map(h=>[h.turno_id,h]));

    // 3) Cargar perfiles de especialistas
    const espIds = Array.from(new Set(rawTurnos.map(r=>r.especialista_id)));
    const { data: profs } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', espIds);
    const mapEsp = new Map<string,Perfil>((profs ?? []).map(p=>[p.user_id,p]));

    // 4) Enriquecer y armar searchText
    const enriched = rawTurnos.map(r => {
      const esp = mapEsp.get(r.especialista_id)!;
      const hc  = mapHist.get(r.id);
      const parts = [
        r.especialidad,
        `${esp.nombre} ${esp.apellido}`,
        ...(hc ? [
          `altura ${hc.altura} cm`,
          `peso ${hc.peso} kg`,
          `temperatura ${hc.temperatura} °C`,
          `presión ${hc.presion}`
        ] : []),
        ...((hc?.historia_detalles||[]).map((d:any)=>`${d.clave} ${d.valor}`))
      ];
      return {
        ...r,
        especialista: esp,
        historia: hc,
        searchText: parts.join(' ').toLowerCase()
      };
    });

    // 5) Generar lista de profesionales atendidos (estado = Realizado)
    const profMap = new Map<string,Perfil>();
    enriched
      .filter(t=>t.estado==='Realizado')
      .forEach(t=> profMap.set(t.especialista.user_id, t.especialista));
    this.profesionalesAtendidos = Array.from(profMap.values());

    // 6) Inyectar en dataSource
    this.dataSource = new MatTableDataSource(enriched);
    this.dataSource.filter = (this.filterCtrl.value||'').toLowerCase().trim();
  }

  /** Descarga PDF con todas las atenciones realizadas por un profesional */
  async downloadAtenciones(prof: Perfil) {
    // Traer turnos realizados de este profesional
    const { data: turns = [], error } = await this.supa
      .from('turnos')
      .select('fecha,hora,especialidad')
      .eq('paciente_id', this.userId)
      .eq('especialista_id', prof.user_id)
      .eq('estado','Realizado')
      .order('fecha',{ ascending:false });
    if (error) {
      this.snack.open('Error al cargar atenciones','Cerrar',{duration:3000});
      return;
    }
    if (!turns || !turns.length) {
      this.snack.open(`No hay atenciones con ${prof.nombre}`,'Cerrar',{duration:3000});
      return;
    }

    // Construir contenedor HTML para el PDF
    const div = document.createElement('div');
    div.style.background = 'white';
    div.style.padding = '20px';
    div.innerHTML = `
      <div style="text-align:center; margin-bottom:16px;">
        <img src="/assets/logo.png" alt="Logo" style="height:50px;"><br>
        <h2>Informe de Atenciones</h2>
        <p>Profesional: ${prof.nombre} ${prof.apellido}</p>
        <p>Emitido: ${new Date().toLocaleDateString()}</p>
      </div>
      <table border="1" cellpadding="4" cellspacing="0"
             style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr><th>Fecha</th><th>Hora</th><th>Especialidad</th></tr>
        </thead>
        <tbody>
          ${turns.map(t=>`
            <tr>
              <td>${t.fecha}</td>
              <td>${t.hora}</td>
              <td>${t.especialidad}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
    document.body.appendChild(div);

    // Renderizar a canvas y generar PDF
    const canvas = await html2canvas(div, { scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p','pt','a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, w, h);
    pdf.save(`atenciones_${prof.nombre}_${prof.apellido}.pdf`);
    document.body.removeChild(div);
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

    goToHistoria(row: any) {
    // navega a la página de historia, pasando el turnoId
   this.router.navigate(['/paciente/historia-clinica'], {
      queryParams: { turnoId: row.id }
    });
  }

  goBack(){ this.location.back(); }
}
