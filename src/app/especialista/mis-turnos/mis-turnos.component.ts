// src/app/especialista/mis-turnos/mis-turnos.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { MatFormFieldModule }from '@angular/material/form-field';
import { MatInputModule }    from '@angular/material/input';
import { MatListModule }     from '@angular/material/list';
import { SupabaseService }   from '../../core/supabase.service';
import { take } from 'rxjs/operators';

interface Turno {
  id:            number;
  specialty:     string;
  patient_name:  string;
  date:          string;
  time:          string;
  status:        string;
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
  selector: 'app-mis-turnos-especialista',
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss']
})
export class MisTurnosEspecialistaComponent implements OnInit {
  allTurnos: Turno[] = [];
  filtered: Turno[]  = [];
  filterTerm = '';

  constructor(private supa: SupabaseService) {}

  async ngOnInit() {
    const session = await this.supa.session$.pipe(take(1)).toPromise();
    const userId = session?.user.id!;
    const { data, error } = await this.supa
      .from('appointments')
      .select('id,specialty,patient_name,date,time,status')
      .eq('specialist_id', userId);
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
      t.patient_name.toLowerCase().includes(term)
    );
  }
}
