import { Component, OnInit }                   from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormControl, ReactiveFormsModule }    from '@angular/forms';
import { MatTableModule, MatTableDataSource }  from '@angular/material/table';
import { MatFormFieldModule }                  from '@angular/material/form-field';
import { MatInputModule }                      from '@angular/material/input';
import { MatButtonModule }                     from '@angular/material/button';
import { MatIconModule }                       from '@angular/material/icon';
import { MatCardModule }                       from '@angular/material/card';
import { MatDialog, MatDialogModule }          from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule }      from '@angular/material/snack-bar';
import { MatListModule }                       from '@angular/material/list';
import { Router, RouterModule }                from '@angular/router';
import { Location }                            from '@angular/common';

import { SupabaseService }                     from '../../core/supabase.service';
import { AuthService }                         from '../../core/auth.service';
import { Turno }                               from '../../models/turno.model';
import { CancelarTurnoDialogComponent }        from '../../turnos/cancelar-turno-dialog/cancelar-turno-dialog.component';
import { VerResenaDialogComponent }            from '../../turnos/ver-resena-dialog/ver-resena-dialog.component';
import { EncuestaDialogComponent }             from '../../turnos/encuesta-dialog/encuesta-dialog.component';
import { PacienteDetalleComponent } from '../paciente-detalle/paciente-detalle.component';

interface Perfil {
  user_id:    string;
  nombre:     string;
  apellido:   string;
  image_urls: string[];    // ← arreglo de URLs 
}

interface Historia {
  turno_id: number;
  altura:   number;
  peso:     number;
  temperatura: number;
  presion:     string;
  historia_detalles: { clave: string; valor: string }[];
}

type TurnoConHistoria = Turno & {
  paciente:   Perfil;
  historia?:  Historia;
  searchText: string;
};

@Component({
  standalone: true,
  selector:    'app-mis-turnos-especialista',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,          // <-- importado
    MatDialogModule,
    MatSnackBarModule,
    MatListModule,
    RouterModule
  ],
  templateUrl: './mis-turnos.component.html',
  styleUrls:   ['./mis-turnos.component.scss']
})
export class MisTurnosEspecialistaComponent implements OnInit {
  filterCtrl       = new FormControl('');
  displayedColumns = ['fecha','hora','especialidad','paciente','estado','historia','acciones'];
  dataSource!: MatTableDataSource<TurnoConHistoria>;

  showPacientes        = false;
  pacientesAtendidos:  Perfil[] = [];
  selectedPaciente:    Perfil | null = null;
  favoritos            = new Set<string>();

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
    this.dataSource.filterPredicate = (row, filter) =>
      row.searchText.includes(filter);
    this.filterCtrl.valueChanges.subscribe(term => {
      this.dataSource.filter = (term || '').toLowerCase().trim();
    });
  }

  private async loadTurnos() {
    const user = await this.auth.currentUser();
    if (!user) return;

    // 1) Turnos
    const { data: rawTurnosData, error: errT } = await this.supa
      .from('turnos')
      .select(`
        id, fecha, hora, especialidad,
        paciente_id, especialista_id,
        estado, comentario_especialista,
        comentario_paciente
      `)
      .eq('especialista_id', user.id)
      .order('fecha', { ascending: false });
    if (errT) { console.error(errT); return; }
    const rawTurnos: Turno[] = rawTurnosData ?? [];

    // 2) Historias
    const turnoIds = rawTurnos.map(t => t.id);
    const { data: historiasData, error: errH } = await this.supa
      .from('historia_clinica')
      .select(`
        turno_id, altura, peso, temperatura,
        presion, historia_detalles ( clave, valor )
      `)
      .in('turno_id', turnoIds);
    const mapHist = new Map<number, Historia>(
      (historiasData ?? []).map(h => [h.turno_id, h])
    );

    // 3) Perfiles con avatar
    const pacIds = Array.from(new Set(rawTurnos.map(t => t.paciente_id)));
    const { data: profsData, error: errP } = await this.supa
      .from('profiles')
      .select('user_id, nombre, apellido, image_urls')
      .in('user_id', pacIds);
    if (errP) { console.error(errP); return; }
    const mapPac = new Map<string, Perfil>(
      (profsData ?? []).map(p => [p.user_id, p])
    );

    // 4) Enriquecer y armar searchText
    const enriched: TurnoConHistoria[] = rawTurnos.map(r => {
      const paciente = mapPac.get(r.paciente_id)!;
      const hc        = mapHist.get(r.id);
      const partes = [
        r.especialidad,
        `${paciente.nombre} ${paciente.apellido}`,
        ...(hc ? [
          `altura ${hc.altura} cm`,
          `peso ${hc.peso} kg`,
          `temp ${hc.temperatura}°C`,
          `presión ${hc.presion}`
        ] : []),
        ...((hc?.historia_detalles || []).map(d => `${d.clave} ${d.valor}`))
      ];
      return {
        ...r,
        paciente,
        historia: hc,
        searchText: partes.join(' ').toLowerCase()
      };
    });

    // 5) Pacientes únicos con al menos un “Realizado”
    const mapAtendidos = new Map<string, Perfil>();
    enriched
      .filter(t => t.estado === 'Realizado')
      .forEach(t => mapAtendidos.set(t.paciente.user_id, t.paciente));
    this.pacientesAtendidos = Array.from(mapAtendidos.values());

    // 6) DataSource
    this.dataSource = new MatTableDataSource(enriched);
    this.dataSource.filter = (this.filterCtrl.value || '').toLowerCase().trim();

    console.log('▶ rawTurnosData:', rawTurnosData);
    console.log('▶ enriched:', enriched);
    console.log('▶ pacientesAtendidos:', this.pacientesAtendidos);
  }

  // Sólo los turnos del paciente seleccionado
  get turnosDelPaciente(): TurnoConHistoria[] {
    if (!this.selectedPaciente) return [];
    return this.dataSource.data.filter(
      t => t.paciente.user_id === this.selectedPaciente!.user_id
    );
  }

  selectPaciente(p: Perfil)    { this.selectedPaciente = p; }
  toggleFavorito(p: Perfil)    {
    this.favoritos.has(p.user_id)
      ? this.favoritos.delete(p.user_id)
      : this.favoritos.add(p.user_id);
  }
  togglePacientes(){
    this.showPacientes=!this.showPacientes;
    if(!this.showPacientes)this.selectedPaciente=null;
  }

    /** Genera la URL pública a partir del path almacenable en avatar_url */
  getAvatarUrl(path: string | null | undefined): string {
    if (!path) return '/assets/default-user.jpg';
    // Ajusta 'avatars' al bucket que uses
    const { data } = this.supa.supabase
      .storage
      .from('avatars')
      .getPublicUrl(path);
    return data.publicUrl;
  }

  /** Si la imagen falla, pongo el fallback */
  onAvatarError(imgEvt: Event) {
    const img = imgEvt.target as HTMLImageElement;
    img.src = '/assets/default-user.jpg';
  }

  async openDetalle(p: Perfil) {
    const user = await this.auth.currentUser();
    if (!user) {
      this.snack.open('No se pudo obtener el usuario actual', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(PacienteDetalleComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '80vh',
      panelClass: 'paciente-detalle-dialog',
      autoFocus: false,
      restoreFocus: false,
      data: { paciente: p, especialistaId: user.id }
    });

  }
  // -----------------------------
  // MÉTODOS DE ACCIONES
  // -----------------------------
  aceptar(t: TurnoConHistoria) {
    if (['Realizado','Cancelado','Rechazado'].includes(t.estado)) return;
    this.supa
      .from('turnos')
      .update({ estado: 'Aceptado' })
      .eq('id', t.id)
      .then(({ error }) => {
        if (error) {
          this.snack.open('Error al aceptar','Cerrar',{ duration: 3000 });
        } else {
          this.snack.open('Turno aceptado','Cerrar',{ duration: 2000 });
          this.loadTurnos();
        }
      });
  }

  cancelar(t: TurnoConHistoria) {
    if (['Aceptado','Realizado','Rechazado'].includes(t.estado)) return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Cancelado', comentario_especialista: motivo })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo cancelar','Cerrar',{ duration: 3000 });
      } else {
        this.snack.open('Turno cancelado','Cerrar',{ duration: 2000 });
        this.loadTurnos();
      }
    });
  }

  rechazar(t: TurnoConHistoria) {
    if (['Aceptado','Realizado','Cancelado'].includes(t.estado)) return;
    const ref = this.dialog.open(CancelarTurnoDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async motivo => {
      if (!motivo) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Rechazado', comentario_especialista: motivo })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo rechazar','Cerrar',{ duration: 3000 });
      } else {
        this.snack.open('Turno rechazado','Cerrar',{ duration: 2000 });
        this.loadTurnos();
      }
    });
  }

  finalizar(t: TurnoConHistoria) {
    if (t.estado !== 'Aceptado') return;
    const ref = this.dialog.open(EncuestaDialogComponent, { data: { turno: t } });
    ref.afterClosed().subscribe(async texto => {
      if (!texto) return;
      const { error } = await this.supa
        .from('turnos')
        .update({ estado: 'Realizado', comentario_especialista: texto })
        .eq('id', t.id);
      if (error) {
        this.snack.open('No se pudo finalizar','Cerrar',{ duration: 3000 });
      } else {
        this.snack.open('Turno finalizado','Cerrar',{ duration: 2000 });
        this.loadTurnos();
      }
    });
  }

  verResena(t: TurnoConHistoria) {
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
