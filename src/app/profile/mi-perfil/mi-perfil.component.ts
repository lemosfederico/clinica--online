// src/app/profile/mi-perfil/mi-perfil.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { MatCardModule }         from '@angular/material/card';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatSelectModule }       from '@angular/material/select';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { SupabaseService }       from '../../core/supabase.service';
import { AuthService }           from '../../core/auth.service';

interface Profile {
  user_id:     string;
  nombre:      string;
  apellido:    string;
  edad:        number;
  dni:         string;
  email:       string;
  role:        'paciente' | 'especialista' | 'admin';
  approved:    boolean;
  specialties?: string[];
  image_urls?: string[];
}

@Component({
  standalone: true,
  selector: 'app-mi-perfil',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  profile!: Profile;
  availabilityForm!: FormGroup;
  days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private fb: FormBuilder
  ) {}

  async ngOnInit() {
    const user = await this.auth.currentUser();
    if (!user) return;

    // 1) Cargar perfil
    const { data } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido,edad,dni,email,role,approved,specialties,image_urls')
      .eq('user_id', user.id)
      .single();
    this.profile = data as Profile;

    // 2) Si es especialista, inicializar formulario de horarios
    if (this.profile.role === 'especialista') {
      this.initAvailabilityForm(user.id);
    }
  }

  private async initAvailabilityForm(specialistId: string) {
    // 2.1) Cargar franjas existentes
    const { data: avail } = await this.supa
      .from('availability')
      .select('*')
      .eq('specialist_id', specialistId);

    // 2.2) Crear FormArray de grupos por especialidad
    const slots = this.fb.array(
      this.profile.specialties?.map(spec => {
        const timesArray = this.fb.array(
          (avail || [])
            .filter((a: any) => a.specialty === spec)
            .map(a => this.fb.group({
              day:   [a.day,   Validators.required],
              start: [a.start_time, Validators.required],
              end:   [a.end_time,   Validators.required]
            }))
        );
        return this.fb.group({
          specialty: [spec],
          times:     timesArray
        });
      }) || []
    );

    this.availabilityForm = this.fb.group({ slots });
  }

  get slots(): FormArray {
    return this.availabilityForm.get('slots') as FormArray;
  }

    /** Devuelve el FormArray de franjas para el grupo i */
  getTimes(groupIndex: number): FormArray {
    return this.slots.at(groupIndex).get('times') as FormArray;
  }


  addSlot(groupIndex: number) {
    const times = (this.slots.at(groupIndex).get('times') as FormArray);
    times.push(this.fb.group({
      day:   ['', Validators.required],
      start: ['', Validators.required],
      end:   ['', Validators.required]
    }));
  }

  removeSlot(groupIndex: number, slotIndex: number) {
    const times = (this.slots.at(groupIndex).get('times') as FormArray);
    times.removeAt(slotIndex);
  }

  async saveAvailability() {
    if (this.availabilityForm.invalid) return;
    const user = await this.auth.currentUser();
    if (!user) return;

    // 3) Preparar payload
    const all: any[] = [];
    this.slots.controls.forEach(g => {
      const spec = g.get('specialty')!.value;
      (g.get('times') as FormArray).controls.forEach(t => {
        all.push({
          specialist_id: user.id,
          specialty:     spec,
          day:           t.get('day')!.value,
          start_time:    t.get('start')!.value,
          end_time:      t.get('end')!.value
        });
      });
    });

    // 4) Borrar anteriores y guardar nuevos
    await this.supa
      .from('availability')
      .delete()
      .eq('specialist_id', user.id);

    const { error } = await this.supa.from('availability').insert(all);
    if (error) {
      console.error('Error guardando disponibilidad', error);
    } else {
      console.log('Disponibilidad guardada');
    }
  }
}
