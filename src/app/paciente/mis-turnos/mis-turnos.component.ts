// src/app/paciente/mis-turnos/mis-turnos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { MatFormFieldModule }from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatListModule }     from '@angular/material/list';
import { SupabaseService }   from '../../core/supabase.service';
import { take } from 'rxjs/operators';


interface Turno {
  id:              number;
  specialty:       string;
  specialist_name: string;
  date:            string;
  time:            string;
  status:          string;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule
  ],
  selector: 'app-mis-turnos-paciente',
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss']
})
export class MisTurnosPacienteComponent implements OnInit {
  allTurnos: Turno[] = [];
  filtered: Turno[]  = [];
  filterTerm = '';

  constructor(private supa: SupabaseService) {}

  async ngOnInit() {
    const session = await this.supa.session$.pipe(take(1)).toPromise();
    const userId = session?.user.id!;
    const { data, error } = await this.supa
      .from('appointments')
      .select('id,specialty,specialist_name,date,time,status')
      .eq('patient_id', userId);
    if (error) {
      console.error('Error al cargar turnos:', error);
      return;
    }
    this.allTurnos = data || [];
    this.applyFilter();
  }

  applyFilter() {
    const term = this.filterTerm.trim().toLowerCase();
    this.filtered = this.allTurnos.filter(t =>
      t.specialty.toLowerCase().includes(term) ||
      t.specialist_name.toLowerCase().includes(term)
    );
  }
}
