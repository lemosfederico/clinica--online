// src/app/mi-perfil/mi-perfil.component.ts
import { Component, OnInit }              from '@angular/core';
import { CommonModule }                   from '@angular/common';
import {
  FormBuilder,
  FormArray,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';
import { RouterModule }                   from '@angular/router';
import { MatCardModule }                  from '@angular/material/card';
import { MatIconModule }                  from '@angular/material/icon';
import { MatButtonModule }                from '@angular/material/button';
import { MatFormFieldModule }             from '@angular/material/form-field';
import { MatInputModule }                 from '@angular/material/input';
import { MatSelectModule }                from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService }                from '../../core/supabase.service';
import { AuthService }                    from '../../core/auth.service';
import { Location }                       from '@angular/common';

interface Profile {
  user_id:     string;
  nombre:      string;
  apellido:    string;
  role:        'paciente' | 'especialista';
  specialties?: string[];
  image_urls?:  string[];
}

@Component({
  standalone: true,
  selector: 'app-mi-perfil',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  profile!: Profile;
  loading = true;
  avatarUrl = '';

  // límites de fecha y hora
  minDate!: string;
  maxDate!: string;
  minTime = '5:00';
  maxTime = '23:55';

  scheduleForm!: FormGroup;

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private fb: FormBuilder,
    private location: Location,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Configurar límites de fecha
    const today = new Date();
    this.minDate = today.toISOString().slice(0, 10);
    const plus15 = new Date(today);
    plus15.setDate(plus15.getDate() + 15);
    this.maxDate = plus15.toISOString().slice(0, 10);

    this.loadProfile();
  }

    /** Validador para evitar fechas < minDate o > maxDate */
  dateRangeValidator(control: AbstractControl) {
    const val: string = control.value;
    if (!val) return null;
    if (val < this.minDate) {
      return { beforeMin: true };
    }
    if (val > this.maxDate) {
      return { afterMax: true };
    }
    return null;
  }

  private async loadProfile() {
    const user = await this.auth.currentUser();
    if (!user) return;

    const { data, error } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido,role,specialties,image_urls')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.error(error);
      this.loading = false;
      return;
    }

    this.profile = data;
    this.avatarUrl = data.image_urls?.[0] || 'assets/default-avatar.png';
    this.loading = false;

    if (this.profile.role === 'especialista') {
      this.scheduleForm = this.fb.group({
        entries: this.fb.array([])
      });
      this.loadExistingSchedule();
    }
  }

  private async loadExistingSchedule() {
    const { data: prev, error } = await this.supa
      .from('horarios')
      .select('specialty,availability_date,start_time,end_time')
      .eq('user_id', this.profile.user_id);

    if (!error && prev) {
      prev.forEach(h =>
        this.entries.push(this.fb.group({
          specialty:  [h.specialty],
          date:       [h.availability_date, Validators.required],
          start_time: [h.start_time,      Validators.required],
          end_time:   [h.end_time,        Validators.required]
        }))
      );
    }
  }

  get entries(): FormArray {
    return this.scheduleForm.get('entries') as FormArray;
  }

  addEntry(spec: string) {
    this.entries.push(this.fb.group({
    specialty:  [spec],
    date:       ['', [Validators.required, this.dateRangeValidator.bind(this)]],
    start_time: ['', Validators.required],
    end_time:   ['', Validators.required]
    }));
  }

  removeEntry(i: number) {
    this.entries.removeAt(i);
  }

  async saveSchedule() {
    const list = this.entries.value.map((e: any) => ({
      user_id:           this.profile.user_id,
      specialty:         e.specialty,
      availability_date: e.date,
      start_time:        e.start_time,
      end_time:          e.end_time
    }));

    const { error } = await this.supa
      .from('horarios')
      .upsert(list, { onConflict: 'user_id,specialty,availability_date' });

    if (error) {
      this.snackBar.open(`Error guardando horarios: ${error.message}`, 'Cerrar', { duration: 4000 });
      return;
    }
    this.snackBar.open('Horarios guardados correctamente', 'Cerrar', { duration: 3000 });
  }

  goBack() {
    this.location.back();
  }
}
