import { Component, OnInit }                 from '@angular/core';
import { CommonModule }                      from '@angular/common';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule }                      from '@angular/router';
import { MatCardModule }                     from '@angular/material/card';
import { MatIconModule }                     from '@angular/material/icon';
import { MatButtonModule }                   from '@angular/material/button';
import { MatFormFieldModule }                from '@angular/material/form-field';
import { MatInputModule }                    from '@angular/material/input';
import { MatSelectModule }                   from '@angular/material/select';
import { SupabaseService }                   from '../../core/supabase.service';
import { AuthService }                       from '../../core/auth.service';
import { Location }                          from '@angular/common';

interface Profile {
  user_id:     string;
  nombre:      string;
  apellido:    string;
  edad:        number;
  dni:         string;
  role:        'paciente' | 'especialista';
  image_urls?: string[];
  specialties?: string[];
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
    ReactiveFormsModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  profile!: Profile;
  loading = true;

  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  scheduleForm!: FormGroup;

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private fb: FormBuilder,
    private location: Location
  ) {}

  async ngOnInit() {
    // 1) Cargo perfil
    const user = await this.auth.currentUser();
    if (!user) return;
    const { data, error } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido,edad,dni,role,image_urls,specialties')
      .eq('user_id', user.id)
      .single();
    if (error || !data) {
      console.error(error);
      return;
    }
    this.profile = data;
    this.loading = false;

    // 2) Si soy especialista, preparo form de horarios
    if (this.profile.role === 'especialista') {
      // inicializo el FormGroup
      this.scheduleForm = this.fb.group({
        entries: this.fb.array([])
      });

      // intento cargar horarios previos
      const { data: prev, error: e2 } = await this.supa
        .from('horarios')
        .select('specialty,day,from,to')
        .eq('user_id', this.profile.user_id);
      if (!e2 && prev) {
        prev.forEach((h: any) => {
          this.entries.push(this.fb.group({
            specialty: [h.specialty],
            day:       [h.day],
            from:      [h.from],
            to:        [h.to]
          }));
        });
      }
    }
  }

  // getter para el FormArray
  get entries(): FormArray {
    return this.scheduleForm.get('entries') as FormArray;
  }

  addEntry(spec: string) {
    this.entries.push(this.fb.group({
      specialty: [spec],
      day:       [this.days[0]],
      from:      ['09:00'],
      to:        ['17:00']
    }));
  }

  removeEntry(i: number) {
    this.entries.removeAt(i);
  }

  async saveSchedule() {
    const list = this.entries.value.map((e: any) => ({
      user_id:   this.profile.user_id,
      specialty: e.specialty,
      day:       e.day,
      start_time: e.from,
      end_time:   e.to
    }));

    const { error } = await this.supa
      .from('horarios')
      .upsert(list, { onConflict: 'user_id,specialty,day' });

    if (error) {
      console.error('Error guardando horarios →', error);
      alert(`Error guardando horarios:\n${error.message}\n(Detail: ${error.details})`);
      return;
    }
    alert('Horarios guardados correctamente');
  }

  goBack() {
    this.location.back();
  }
}
