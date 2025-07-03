import { Component, OnInit }       from '@angular/core';
import { CommonModule }            from '@angular/common';
import { MatCardModule }           from '@angular/material/card';
import { MatListModule }           from '@angular/material/list';
import { MatButtonModule }         from '@angular/material/button';
import { RouterModule, Router }    from '@angular/router';
import { SupabaseService }         from '../../core/supabase.service';
import { AuthService }             from '../../core/auth.service';

interface Perfil { user_id: string; nombre: string; apellido: string; }

@Component({
  standalone: true,
  selector: 'app-pacientes-atendidos',
  imports: [CommonModule, MatCardModule, MatListModule, MatButtonModule, RouterModule],
  templateUrl: './pacientes-atendidos.component.html',
})
export class PacientesAtendidosComponent implements OnInit {
  pacientes: Perfil[] = [];

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = await this.auth.currentUser();
    if (!user) return;
    // 1) Traer todos los turnos de este especialista
    const { data: turnos } = await this.supa
      .from('turnos')
      .select('paciente_id')
      .eq('especialista_id', user.id);

    if (!turnos) return;
    const ids = Array.from(new Set(turnos.map(t => t.paciente_id)));
    if (ids.length === 0) return;

    // 2) Traer perfiles de esos pacientes
    const { data: perfiles } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', ids);

    this.pacientes = perfiles || [];
  }

  verHistoria(p: Perfil) {
    this.router.navigateByUrl(`/especialista/historia/${p.user_id}`);
  }
}
