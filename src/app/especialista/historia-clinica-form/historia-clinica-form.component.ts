// src/app/especialista/historia-clinica-form/historia-clinica-form.component.ts

import { Component, OnInit }      from '@angular/core';
import { CommonModule }           from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ReactiveFormsModule
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterModule
} from '@angular/router';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';
import { MatCardModule }          from '@angular/material/card';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatInputModule }         from '@angular/material/input';
import { MatButtonModule }        from '@angular/material/button';
import { MatIconModule }          from '@angular/material/icon';
import { Location }               from '@angular/common';

import { SupabaseService }        from '../../core/supabase.service';
import { AuthService }            from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-historia-clinica-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './historia-clinica-form.component.html',
  styleUrls: ['./historia-clinica-form.component.scss']
})
export class HistoriaClinicaFormComponent implements OnInit {
  form!: FormGroup;
  turnoId!: number;
  pacienteId!: string;
  especialistaId!: string;
  isEdit = false;
  canEdit = false;
  maxDetalles = 3;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private supa: SupabaseService,
    private auth: AuthService,
    private snack: MatSnackBar,
    private location: Location
  ) {}

  ngOnInit() {
    // 1) Obtenemos turnoId de la ruta: /especialista/historia-clinica/:turnoId
    this.turnoId = Number(this.route.snapshot.params['turnoId']);
    if (isNaN(this.turnoId)) {
      this.snack.open('Turno inválido', 'Cerrar', { duration: 3000 });
      this.location.back();
      return;
    }

    // 2) Construimos el form
    this.form = this.fb.group({
      altura:      ['', [Validators.required, Validators.min(0)]],
      peso:        ['', [Validators.required, Validators.min(0)]],
      temperatura: ['', [Validators.required]],
      presion:     ['', [Validators.required]],
      detalles:    this.fb.array([])
    });

    // 3) Validamos sesión y turno
    this.auth.currentUser().then(user => {
      if (!user) {
        this.router.navigateByUrl('/login');
        return;
      }
      this.especialistaId = user.id;
      this.loadAndCheckTurno();
    });
  }

  /** Getter para el array de detalles dinámicos */
  get detalles(): FormArray {
    return this.form.get('detalles') as FormArray;
  }

  addDetalle(clave = '', valor = '') {
    if (this.detalles.length >= this.maxDetalles) return;
    this.detalles.push(
      this.fb.group({
        clave: [clave, Validators.required],
        valor: [valor, Validators.required]
      })
    );
  }

  removeDetalle(i: number) {
    this.detalles.removeAt(i);
  }

  /** 4) Carga el turno y verifica estado + especialista, luego precarga historia si existe */
  private async loadAndCheckTurno() {
    // 4.1) Traemos el turno para validar
    const { data: turno, error: errT } = await this.supa
      .from('turnos')
      .select('id, paciente_id, especialista_id, estado')
      .eq('id', this.turnoId)
      .single();

    if (errT || !turno) {
      this.snack.open('Turno no encontrado', 'Cerrar', { duration: 3000 });
      this.location.back();
      return;
    }

    if (turno.especialista_id !== this.especialistaId) {
      this.snack.open('No tienes permiso para editar esta historia', 'Cerrar', { duration: 3000 });
      this.location.back();
      return;
    }
    if (turno.estado !== 'Realizado') {
      this.snack.open(
        'Solo puedes crear/editar la historia una vez que el turno esté realizado',
        'Cerrar',
        { duration: 3000 }
      );
      this.form.disable();
      return;
    }

    // 4.2) Guardamos pacienteId y permitimos editar
    this.pacienteId = turno.paciente_id;
    this.canEdit    = true;

    // 4.3) Precargamos la historia clínica de este turno
    const { data: hc, error: errHC } = await this.supa
      .from('historia_clinica')
      .select(`
        id,
        altura,
        peso,
        temperatura,
        presion,
        historia_detalles ( clave, valor )
      `)
      .eq('turno_id', this.turnoId)
      .single();

    if (!errHC && hc) {
      this.isEdit = true;
      this.form.patchValue({
        altura:      hc.altura,
        peso:        hc.peso,
        temperatura: hc.temperatura,
        presion:     hc.presion
      });
      // precargamos detalles dinámicos
      hc.historia_detalles.forEach((d: any) =>
        this.addDetalle(d.clave, d.valor)
      );
    }
  }

  /** 5) Envía insert o update usando turno_id + paciente_id */
  async onSubmit() {
    if (!this.canEdit) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      turno_id:    this.turnoId,
      paciente_id: this.pacienteId,
      altura:      Number(this.form.value.altura),
      peso:        Number(this.form.value.peso),
      temperatura: Number(this.form.value.temperatura),
      presion:     String(this.form.value.presion),
      detalles:    this.form.value.detalles
    };

    const { error } = await this.supa.upsertHistoria(payload);
    if (error) {
      this.snack.open('Error guardando historia: ' + error, 'Cerrar', { duration: 3000 });
      return;
    }

    const msg = this.isEdit
      ? 'Historia clínica actualizada correctamente'
      : 'Historia clínica creada correctamente';

    const ref = this.snack.open(msg, 'Cerrar', { duration: 3000 });
    ref.afterDismissed().subscribe(() =>
      this.router.navigateByUrl('/especialista/mis-turnos')
    );
  }

  goBack() {
    this.location.back();
  }
}
