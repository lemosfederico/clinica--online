// src/app/mi-perfil/mi-perfil.component.ts

import { Component, OnInit }                   from '@angular/core';
import { CommonModule }                        from '@angular/common';
import { FormsModule }                         from '@angular/forms';
import { RouterModule }                        from '@angular/router';
import { MatCardModule }                       from '@angular/material/card';
import { MatIconModule }                       from '@angular/material/icon';
import { MatButtonModule }                     from '@angular/material/button';
import { MatFormFieldModule }                  from '@angular/material/form-field';
import { MatInputModule }                      from '@angular/material/input';
import { MatListModule }                       from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule }      from '@angular/material/snack-bar';

import { SupabaseService }   from '../../core/supabase.service';
import { AuthService }       from '../../core/auth.service';
import { Location }          from '@angular/common';

interface Profile {
  user_id:    string;
  nombre:     string;
  apellido:   string;
  role:       'paciente' | 'especialista';
  image_urls?: string[];
}

interface WeeklySchedule {
  dayOfWeek: number;  // 0=Domingo … 6=Sábado
  from:       string; // "HH:mm"
  to:         string; // "HH:mm"
}

@Component({
  standalone: true,
  selector:    'app-mi-perfil',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    FormsModule,
    MatSnackBarModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls:   ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  profile!: Profile;
  loading = true;
  avatarUrl = '';

  // Días de la semana completos
  days = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ];
  daysMap: Record<number,string> = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes',
    3: 'Miércoles', 4: 'Jueves', 5: 'Viernes',
    6: 'Sábado',
  };

  minTime = '05:00';
  maxTime = '23:55';

  // UI de horarios
  selectedDays: number[] = [];
  from = '';
  to   = '';
  editMode = false;

  weeklySchedules: WeeklySchedule[] = [];

  constructor(
    private supa:      SupabaseService,
    private auth:      AuthService,
    private snackBar:  MatSnackBar,
    private location:  Location
  ) {}

  async ngOnInit() {
    await this.loadProfile();
    if (this.profile.role === 'especialista') {
      await this.loadExistingSchedules();
    }
  }

  private async loadProfile() {
    const user = await this.auth.currentUser();
    if (!user) return;

    const { data, error } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido,role,image_urls')
      .eq('user_id', user.id)
      .single();

    this.loading = false;
    if (error || !data) return;

    this.profile   = data;
    this.avatarUrl = data.image_urls?.[0] || 'assets/default-avatar.png';
  }

  private async loadExistingSchedules() {
    const { data, error } = await this.supa
      .from('horarios_semanales')
      .select('dia_semana,desde,hasta')
      .eq('especialista_id', this.profile.user_id);

    if (!error && data) {
      this.weeklySchedules = data.map((h: any) => ({
        dayOfWeek: h.dia_semana,
        from:      h.desde,
        to:        h.hasta
      }));
    }
  }

  toggleDay(day: number) {
    const idx = this.selectedDays.indexOf(day);
    if (idx >= 0) this.selectedDays.splice(idx,1);
    else          this.selectedDays.push(day);
  }

  addOrUpdateSchedule() {
    // 1) Validación: end > start
    const startMin = this.parseMinutes(this.from);
    const endMin   = this.parseMinutes(this.to);
    if (endMin <= startMin) {
      this.snackBar.open(
        'La hora de fin debe ser mayor a la de inicio',
        'Cerrar', { duration:3000 }
      );
      return;
    }

    // 2) Añade o actualiza sin duplicar días
    this.selectedDays.forEach(day => {
      const idx = this.weeklySchedules.findIndex(s => s.dayOfWeek === day);
      if (idx >= 0) {
        this.weeklySchedules[idx].from = this.from;
        this.weeklySchedules[idx].to   = this.to;
      } else {
        this.weeklySchedules.push({ dayOfWeek: day, from: this.from, to: this.to });
      }
    });

    // 3) Reset UI
    this.selectedDays = [];
    this.from = '';
    this.to   = '';
    this.editMode = false;
  }

  startEdit(schedule: WeeklySchedule) {
    this.editMode = true;
    this.selectedDays = [ schedule.dayOfWeek ];
    this.from = schedule.from;
    this.to   = schedule.to;
  }

  removeSchedule(day: number) {
    this.weeklySchedules = this.weeklySchedules.filter(s => s.dayOfWeek !== day);
    if (this.editMode && this.selectedDays.includes(day)) {
      this.selectedDays = [];
      this.from = '';
      this.to = '';
      this.editMode = false;
    }
  }

  async saveSchedules() {
    const user = await this.auth.currentUser();
    if (!user) {
      this.snackBar.open('Inicia sesión primero','Cerrar',{duration:3000});
      return;
    }

    const payload = this.weeklySchedules.map(w => ({
      especialista_id: user.id,
      dia_semana:      w.dayOfWeek,
      desde:           w.from,
      hasta:           w.to
    }));

    const { error } = await this.supa
      .from('horarios_semanales')
      .upsert(payload, { onConflict: 'especialista_id,dia_semana' });

    if (error) {
      console.error(error);
      this.snackBar.open('Error guardando horarios','Cerrar',{duration:3000});
    } else {
      this.snackBar.open('Horarios guardados','Cerrar',{duration:2000});
      await this.loadExistingSchedules();
    }
  }

  goBack() {
    this.location.back();
  }

  private parseMinutes(t: string) {
    const [h,m] = t.split(':').map(Number);
    return h*60 + m;
  }
}
