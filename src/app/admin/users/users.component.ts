// src/app/admin/users/users.component.ts
import { Component, OnInit }       from '@angular/core';
import { CommonModule }            from '@angular/common';
import { MatTableModule }          from '@angular/material/table';
import { MatButtonModule }         from '@angular/material/button';
import { SupabaseService }         from '../../core/supabase.service';

interface Profile {
  user_id:  string;
  role:     string;
  nombre:   string;
  apellido: string;
  approved: boolean;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule
  ],
  selector: 'app-admin-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  profiles: Profile[] = [];
  columns   = ['nombre','apellido','role','approved','actions'];

  constructor(private supa: SupabaseService) {}

  async ngOnInit() {
    const { data, error } = await this.supa
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error al cargar usuarios:', error);
      return;
    }
    this.profiles = data || [];
  }

  async toggleApprove(p: Profile) {
    const { error } = await this.supa
      .from('profiles')
      .update({ approved: !p.approved })
      .eq('user_id', p.user_id);

    if (error) {
      console.error('Error al actualizar aprobación:', error);
      return;
    }
    p.approved = !p.approved;
  }
}
