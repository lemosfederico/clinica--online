// src/app/turnos/solicitar-turno/solicitar-turno.component.ts

import { Component, OnInit }              from '@angular/core';
import { CommonModule }                   from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, Router }           from '@angular/router';
import { Location }                       from '@angular/common';
import { MatIconModule }                  from '@angular/material/icon';
import { MatCardModule }                  from '@angular/material/card';
import { MatButtonModule }                from '@angular/material/button';
import { MatFormFieldModule }             from '@angular/material/form-field';
import { MatSelectModule }                from '@angular/material/select';

import { SupabaseService }                from '../../core/supabase.service';
import { AuthService }                    from '../../core/auth.service';

interface Perfil {
  user_id:   string;
  nombre:    string;
  apellido:  string;
  image_urls?: string[];
  role?:     string;
}

interface WeeklyScheduleRaw {
  dia_semana: number;   // 0=Domingo … 6=Sábado
  desde:      string;   // "HH:mm"
  hasta:      string;   // "HH:mm"
}

@Component({
  standalone: true,
  selector: 'app-solicitar-turno',
  imports: [
    CommonModule,
    MatSnackBarModule,
    RouterModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent implements OnInit {
  // ROLE & PATIENT SELECTION
  isAdmin = false;
  pacientes: Perfil[] = [];
  selectedPacienteId: string | null = null;

  // STEPS
  step = 0; // 0=elige paciente (solo admin), 1=especialidad,2=profesional,3=slot
  specialidades: string[] = [];
  especialistas: Perfil[] = [];

  // SLOTS
  slots: Array<{ display:string; isoDate:string; time:string; dia:string }> = [];
  selectedEspecialidad: string | null = null;
  selectedProfesional:  Perfil | null   = null;
  selectedSlot:         any    | null   = null;

  private weeklyRaw: WeeklyScheduleRaw[] = [];
  readonly daysMap = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  constructor(
    private supa:    SupabaseService,
    private auth:    AuthService,
    private snack:   MatSnackBar,
    private router:  Router,
    private location: Location
  ) {}

  async ngOnInit() {
    const u = await this.auth.currentUser();
    if (!u) throw Error('Necesitas estar logueado');

    const { data: me } = await this.supa
      .from('profiles')
      .select('role')
      .eq('user_id', u.id)
      .single();
    this.isAdmin = me?.role === 'admin';

    if (this.isAdmin) {
      // paso 0: elegir paciente
      const { data: pats, error } = await this.supa
        .from('profiles')
        .select('user_id,nombre,apellido,image_urls,role,approved')
        .eq('role','paciente')
        .eq('approved', true);
      if (!error && pats) this.pacientes = pats;
      this.step = 0;
    } else {
      // si no soy admin salto al paso 1
      this.step = 1;
    }

    await this.loadEspecialidades();
  }

  // ADMIN -> seleccionar paciente
  selectPaciente(p: Perfil) {
    this.selectedPacienteId = p.user_id;
    this.step = 1; // ahora paso a elegir especialidad
  }

  private async loadEspecialidades() {
    const { data: perfiles } = await this.supa
      .from('profiles')
      .select('specialties')
      .eq('role','especialista')
      .eq('approved',true);
    const all = perfiles?.flatMap(x => x.specialties || []) || [];
    this.specialidades = Array.from(new Set(all));
  }

  // PASO 1 -> especialidad
  selectEspecialidad(s: string) {
    this.selectedEspecialidad = s;
    this.step = 2;
    this.loadProfesionales(s);
  }

  private async loadProfesionales(espec: string) {
    const { data: profs } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido,image_urls')
      .eq('role','especialista')
      .eq('approved',true)
      .contains('specialties',[espec]);
    this.especialistas = profs || [];
  }

  // PASO 2 -> profesional
  async selectProfesional(p: Perfil): Promise<void> {
    this.selectedProfesional = p;
    const { data: raw, error } = await this.supa
      .from('horarios_semanales')
      .select('dia_semana,desde,hasta')
      .eq('especialista_id', p.user_id);
    if (error || !raw?.length) {
      this.snack.open('Sin franjas semanales','Cerrar',{duration:3000});
      return;
    }
    this.weeklyRaw = raw;
    await this.loadDateTimeSlots();
    this.step = 3;
    return;
  }

  // Generar slots próximos 15 días
  private async loadDateTimeSlots() {
    const now = new Date(), nowMin = now.getHours()*60 + now.getMinutes();
    const { data: ocup } = await this.supa
      .from('turnos')
      .select('fecha,hora')
      .eq('especialista_id', this.selectedProfesional!.user_id)
      .in('estado',['Pendiente','Aceptado','Realizado']);
    const occupied = (ocup||[]).map(t=>`${t.fecha}|${t.hora}`);

    const today = new Date(),
          limit = new Date(); limit.setDate(today.getDate()+15);

    const result: typeof this.slots = [];
    for (let d=new Date(today); d<=limit; d.setDate(d.getDate()+1)) {
      const dow = d.getDay(),
            franjas = this.weeklyRaw.filter(w=>w.dia_semana===dow);
      for (const f of franjas) {
        let cur=this.parseMinutes(f.desde),
            end=this.parseMinutes(f.hasta);
        while(cur+30<=end){
          if(d.toDateString()===today.toDateString() && cur<nowMin){ cur+=30; continue; }
          const t=this.formatTime(cur),
                yyyy=d.getFullYear(),
                mm=String(d.getMonth()+1).padStart(2,'0'),
                dd=String(d.getDate()).padStart(2,'0'),
                isoDate=`${yyyy}-${mm}-${dd}`;
          if(!occupied.includes(`${isoDate}|${t}`)){
            result.push({
              display: `${dd}/${mm} ${t}`,
              isoDate,
              time: t,
              dia: `${this.daysMap[dow]} ${d.toLocaleDateString('es-AR')}`
            });
          }
          cur+=30;
        }
      }
    }
    this.slots = result;
  }

  selectSlot(slot: any) {
    this.selectedSlot = slot;
  }

  // PASO FINAL -> submit
  async onSubmit() {
    // admin debe haber elegido paciente
    if (this.isAdmin && !this.selectedPacienteId) {
      return this.snack.open('Selecciona un paciente', 'Cerrar', {duration:3000});
    }
    // todos los pasos
    if (!this.selectedEspecialidad || !this.selectedProfesional || !this.selectedSlot) {
      return this.snack.open('Completa todos los pasos', 'Cerrar', {duration:3000});
    }

    const user = await this.auth.currentUser();
    const payload = {
      paciente_id:     this.isAdmin ? this.selectedPacienteId : user!.id,
      especialista_id: this.selectedProfesional!.user_id,
      especialidad:    this.selectedEspecialidad,
      fecha:           this.selectedSlot.isoDate,
      hora:            this.selectedSlot.time,
      estado:          'Pendiente'
    };
    console.log('INSERT TURNOS:', payload);

    const { error } = await this.supa.from('turnos').insert(payload);
    if (error) {
      console.error('Insert error:', error);
      return this.snack.open('Error al solicitar turno: '+error.message, 'Cerrar',{duration:4000});
    }
    this.snack.open('Turno solicitado', 'Cerrar',{duration:2000});
    this.router.navigateByUrl('/paciente/mis-turnos');
    return;
  }
   onSelectEspecialidad(spec: string) {
    this.selectedEspecialidad = spec;
    this.step = 2;
    this.loadProfesionales(spec);
  }
    /**
   * Devuelve la URL absoluta al asset de la especialidad,
   * transformando acentos y espacios a un nombre de archivo válido.
   */
  getEspecialidadImage(spec: string | null): string {
    if (!spec) {
      return '/assets/default-spec.jpg';
    }
    // aquí ya sabemos que spec es string
    const name = spec
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    return `/assets/especialidades/${name}.jpg`;
  }

    /** Manejador de error de imagen para limpiar el onerror y asignar fallback */
  onImgError(img: HTMLImageElement, fallback: string) {
    img.onerror = null;
    img.src = fallback;
  }


  goBack() {
    this.location.back();
  }

  private parseMinutes(t:string) {
    const [h,m] = t.split(':').map(Number);
    return h*60 + m;
  }
  private formatTime(m:number) {
    const h=Math.floor(m/60), mm=m%60;
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
}
