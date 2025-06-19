// src/app/turnos/solicitar-turno/solicitar-turno.component.ts
import { Component, OnInit }              from '@angular/core';
import { CommonModule }                   from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatFormFieldModule }             from '@angular/material/form-field';
import { MatInputModule }                 from '@angular/material/input';
import { MatSelectModule }                from '@angular/material/select';
import { MatButtonModule }                from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, Router }           from '@angular/router';
import { Location }                       from '@angular/common';
import { MatIconModule }                  from '@angular/material/icon';
import { MatCardModule }                  from '@angular/material/card';

import { SupabaseService }                from '../../core/supabase.service';
import { AuthService }                    from '../../core/auth.service';

interface Perfil {
  user_id:  string;
  nombre:   string;
  apellido: string;
}

// Para el select de fechas con disponibilidad
interface DateOption {
  value: string; // "YYYY-MM-DD"
  label: string; // "DD/MM/YYYY"
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
    RouterModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent implements OnInit {
  form: FormGroup;

  especialistas: Perfil[] = [];
  specialidades: string[] = [];
  pacientes: Perfil[]    = [];

  // Ahora sólo fechas que tengan horarios
  availableDates:   DateOption[] = [];
  availableTimeSlots: string[]   = [];

  isAdmin = false;

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private auth: AuthService,
    private snack: MatSnackBar,
    private router: Router,
    private location: Location
  ) {
    this.form = this.fb.group({
      paciente:     [''],
      especialista: ['', Validators.required],
      especialidad: ['', Validators.required],
      fecha:        ['', Validators.required],
      hora:         ['', Validators.required]
    });
  }

  async ngOnInit() {
    console.log('🔄 ngOnInit');
    await this.loadUserRoleAndPatients();
    await this.loadEspecialistas();

    // Cuando el usuario elija un especialista:
    this.form.get('especialista')!.valueChanges.subscribe(async espId => {
      console.log('→ Especialista seleccionado:', espId);
      this.specialidades = [];
      this.availableDates = [];
      this.availableTimeSlots = [];
      this.form.patchValue({ especialidad: '', fecha: '', hora: '' });

      if (!espId) return;
      const { data: prof } = await this.supa
        .from('profiles')
        .select('specialties')
        .eq('user_id', espId)
        .single();
      this.specialidades = prof?.specialties || [];
      console.log('   - Especialidades:', this.specialidades);
    });

    // Cuando elija una especialidad:
    this.form.get('especialidad')!.valueChanges.subscribe(async espTrat => {
      console.log('→ Especialidad seleccionada:', espTrat);
      this.availableDates = [];
      this.availableTimeSlots = [];
      this.form.patchValue({ fecha: '', hora: '' });

      const espId = this.form.get('especialista')!.value;
      if (!espId || !espTrat) return;

      // Tomo todas las availability_date que tenga horarios
      const { data: hrs } = await this.supa
        .from('horarios')
        .select('availability_date')
        .eq('user_id', espId)
        .eq('specialty', espTrat);

      const uniq = Array.from(new Set(hrs?.map(h => h.availability_date) || []));
      console.log('   - Fechas crudas desde BD:', uniq);

      // Mapeo a DateOption (value+label)
      this.availableDates = uniq
      .sort()
      .map(d => ({
        value: d,
        label: this.formatDateLabel(d)
      }));
      console.log('   - availableDates:', this.availableDates);
    });

    // Cuando elija una fecha:
    this.form.get('fecha')!.valueChanges.subscribe(fecha => {
      console.log('→ Fecha seleccionada:', fecha);
      this.loadAvailability(fecha);
    });
  }

  private async loadUserRoleAndPatients() {
    console.log('🔄 loadUserRoleAndPatients');
    const user = await this.auth.currentUser();
    if (!user) return;
    const { data: me } = await this.supa
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    this.isAdmin = me?.role === 'admin';
    console.log('   - Es admin?', this.isAdmin);

    if (this.isAdmin) {
      this.form.get('paciente')!.setValidators(Validators.required);
      const { data: pats } = await this.supa
        .from('profiles')
        .select('user_id,nombre,apellido')
        .eq('role','paciente');
      this.pacientes = pats || [];
      console.log('   - Pacientes cargados:', this.pacientes);
    } else {
      this.form.get('paciente')!.setValue(user.id);
      console.log('   - ID paciente actual:', user.id);
    }
  }

  private async loadEspecialistas() {
    console.log('🔄 loadEspecialistas');
    const { data: especs } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .eq('role','especialista')
      .eq('approved', true);
    this.especialistas = especs || [];
    console.log('   - Especialistas:', this.especialistas);
  }

  // Dentro de SolicitarTurnoComponent...

  private async loadAvailability(fecha: string) {
    console.log('🔄 loadAvailability(', fecha, ')');
    this.availableTimeSlots = [];

    const espId   = this.form.get('especialista')!.value;
    const espTrat = this.form.get('especialidad')!.value;
    const pacId   = this.form.get('paciente')!.value;
    if (!espId || !espTrat || !fecha) return;

    // 1️⃣ Traigo los horarios "oficiales" para esa fecha
    let { data: hrs, error } = await this.supa
      .from('horarios')
      .select('start_time,end_time')
      .eq('user_id', espId)
      .eq('specialty', espTrat)
      .eq('availability_date', fecha);
    console.log('   - horarios por fecha:', hrs, error);

    // 2️⃣ Fallback day-of-week si fuera necesario…
    if ((hrs?.length || 0) === 0 && !error) {
      const dow = new Date(fecha)
        .toLocaleDateString('es-AR',{ weekday:'long' })
        .replace(/^./, c => c.toUpperCase());
      ({ data: hrs, error } = await this.supa
        .from('horarios')
        .select('start_time,end_time')
        .eq('user_id', espId)
        .eq('specialty', espTrat)
        .eq('day', dow));
      console.log('   - horarios por day-of-week:', hrs, error);
    }

    if (error) {
      this.snack.open('Error cargando horarios','Cerrar',{duration:3000});
      return;
    }
    if (!hrs || hrs.length === 0) {
      this.snack.open(`No hay horarios para ${fecha}`,'Cerrar',{duration:3000});
      return;
    }

    // 3️⃣ Genero los slots de 30'
    let slots = hrs.flatMap(h =>
      this.generateTimeSlots(h.start_time, h.end_time, 30)
    );
    console.log('   - slots antes de filtrar:', slots);

    // 4️⃣ Filtro los que YA pediste
    const { data: myTurns } = await this.supa
      .from('turnos')
      .select('hora')
      .eq('paciente_id', pacId)
      .eq('especialista_id', espId)
      .eq('fecha', fecha);
    const booked = myTurns?.map(t => t.hora) || [];
    console.log('   - slots ya reservados por este paciente:', booked);

    slots = slots.filter(s => !booked.includes(s));
    console.log('   - slots disponibles finales:', slots);

    this.availableTimeSlots = slots;

    if (slots.length === 0) {
      this.snack.open(`Ya solicitaste todos los turnos posibles para el ${fecha}`,'Cerrar',{duration:3000});
    }
  }


  // parseo manual de YYYY-MM-DD a día/mes/año en local
  private formatDateLabel(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(n => parseInt(n, 10));
    const dd = String(d).padStart(2,'0');
    const mm = String(m).padStart(2,'0');
    return `${dd}/${mm}/${y}`;
  }

  private parseMinutes(t: string) {
    const [h,m] = t.split(':').map(Number);
    return h*60 + m;
  }
  private formatTime(min: number) {
    const h = Math.floor(min/60), m = min%60;
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  }
  private generateTimeSlots(start: string, end: string, interval: number) {
    const slots: string[] = [];
    let cur    = this.parseMinutes(start),
        endMin = this.parseMinutes(end);
    while (cur + interval <= endMin) {
      slots.push(this.formatTime(cur));
      cur += interval;
    }
    return slots;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { paciente, especialista, especialidad, fecha, hora } = this.form.value;
    console.log('💾 Solicitando turno con:', { paciente, especialista, especialidad, fecha, hora });
    const { error } = await this.supa
      .from('turnos')
      .insert({ paciente_id: paciente,
                especialista_id: especialista,
                especialidad,
                fecha,
                hora,
                estado:'Pendiente' });
    if (error) {
      this.snack.open('Error al solicitar turno','Cerrar',{duration:3000});
    } else {
      this.snack.open('Turno solicitado','Cerrar',{duration:2000});
      this.router.navigateByUrl('/paciente/mis-turnos');
    }
  }

  goBack() {
    this.location.back();
  }
}
