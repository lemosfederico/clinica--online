import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource  } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/supabase.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ErrorService } from '../../core/error.service';
import { Location } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router,RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import { MatCardModule } from '@angular/material/card';



interface Profile {
  user_id:   string;
  nombre:    string;
  apellido:  string;
  edad:      number;
  dni:       string;
  role:      'especialista' | 'admin' | 'paciente';
  approved:  boolean;
  obra_social?: string;    // para pacientes
  specialties?: string[];   // para especialistas
  image_urls?: string[];
}

interface Turno {
  fecha:          string;
  hora:           string;
  especialidad:   string;
  especialista_id:string;
  comentario_paciente?: string;
}

@Component({
  standalone: true,
  selector: 'app-admin-users',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatIconModule,
    RouterModule,
    MatCardModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class AdminUsersComponent implements OnInit {
[x: string]: any;
  profiles: Profile[] = [];
  columns  = ['photos', 'nombre', 'apellido', 'edad', 'dni','obra_social', 'especialidad', 'role', 'approved', 'actions'];
  creatingForm: FormGroup;
  uploading = false;

  logsDataSource = new MatTableDataSource<any>();
  logsDisplayedColumns = ['user_id', 'timestamp'];
    // Para los errores inline del avatar (si los quieres mostrar bajo el input)
  public avatarError = '';

  // Si luego usas <mat-error *ngIf="errorMessage">…
  public errorMessage = '';
  

  favoritos = new Set<string>();

  constructor(
    private supa: SupabaseService,
    private fb: FormBuilder,
    private errorSvc: ErrorService,
    private snack: MatSnackBar,
    private location: Location,
    private router: Router
  ) {
    this.creatingForm = this.fb.group({
      nombre:   ['', Validators.required],
      apellido: ['', Validators.required],
      edad:     [null, [Validators.required, Validators.min(18), Validators.max(120)]],
      dni:      [null, [Validators.required,Validators.pattern(/^\d+$/),Validators.minLength(7),Validators.maxLength(9)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role:     ['especialista', Validators.required],
      avatar:   [null,Validators.required]
    });
  }

  async ngOnInit() {
    await this.loadProfiles();
  }

 
  private async loadProfiles() {
    const { data, error } = await this.supa
      .from('profiles')
      .select(`
        user_id,
        nombre,
        apellido,
        image_urls,
        edad,
        dni,
        obra_social,
        specialties,
        role,
        approved
      `);
    if (error) {
      console.error('Error cargando perfiles:', error);
      return;
    }
    console.log('🔥 Cargados perfiles:', data);
    this.profiles = data;
  }


  async toggleApprove(profile: Profile) {
    if (profile.role !== 'especialista') return;
    
    const newState = !profile.approved;
    const { error } = await this.supa
      .from('profiles')
      .update({ approved: newState })
      .eq('user_id', profile.user_id);

    if (error) {
      console.error('Error al actualizar aprobación:', error);
      return;
    }
    profile.approved = newState;
  }

 onFileChange(event: any) {
  const file: File = event.target.files[0];
  if (!file) {
    this.avatarError = 'Debes seleccionar una imagen.';
    return;
  }
  this.avatarError = '';
  this.creatingForm.patchValue({ avatar: file });
}


  async onSubmit() {
    if (this.creatingForm.invalid) return;
    this.uploading = true;

    try {
      const form = this.creatingForm.value;
      await this.supa.createUser({
        nombre:     form.nombre,
        apellido:   form.apellido,
        edad:       form.edad,
        dni:        form.dni,
        email:      form.email,
        password:   form.password,
        role:       form.role,
        avatarFile: form.avatar
      });
      await this.loadProfiles();
      this.creatingForm.reset({ role: 'especialista' });
    } catch (err: any) {
      const msg = this.errorSvc.translate(err.error || err);
      this.snack.open(msg, 'Cerrar', { duration: 5000 });
    } finally {
      this.uploading = false;
    }
  }

      /** Marca o desmarca como favorito */
  /*toggleFavorito(p: Profile): void {
    if (this.favoritos.has(p.user_id)) {
      this.favoritos.delete(p.user_id);
    } else {
      this.favoritos.add(p.user_id);
    }
  }*/
  
    /** Si falla la carga de imagen, usamos un fallback */
  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/default-user.jpg';
  }

async exportUsers() {
  const rows = this.profiles.map(p => ({
    Nombre:        p.nombre.trim(),
    Apellido:      p.apellido,
    Rol:           p.role,
    Aprobado:      p.approved ? 'Sí' : 'No',
    'Obra Social': p.role === 'paciente'
                        ? (p.obra_social  ?? '')
                        : '',
    Especialidad:  p.role === 'especialista'
                        // Si es array, lo unimos; si no, lo dejamos como string
                        ? (Array.isArray(p.specialties)
                            ? p.specialties.join(', ')
                            : (p.specialties ?? ''))
                        : ''
  }));

  // Para forzar siempre estas seis columnas:
  const headers = [
    'Nombre',
    'Apellido',
    'Rol',
    'Aprobado',
    'Obra Social',
    'Especialidad'
  ];

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
  XLSX.writeFile(wb, 'usuarios.xlsx');
  }


  async exportUserTurns(p: Profile) {
    if (p.role !== 'paciente') return;

    const { data: rawTurnos, error: errT } = await this.supa
      .from('turnos')
      .select(`fecha,hora,especialidad,especialista_id`)
      .eq('paciente_id', p.user_id)
      .eq('estado', 'Realizado')
      .order('fecha', { ascending: false });

    if (errT) {
      console.error(errT);
      this.snack.open('Error al cargar los turnos','Cerrar',{duration:3000});
      return;
    }

    if (!rawTurnos || rawTurnos.length === 0) {
      this.snack.open(
        `El paciente ${p.nombre} ${p.apellido} no tiene turnos realizados.`,
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    const espIds = Array.from(new Set(rawTurnos.map(t => t.especialista_id)));
    const { data: profs } = await this.supa
      .from('profiles')
      .select('user_id,nombre,apellido')
      .in('user_id', espIds);

    const mapEsp = new Map((profs ?? []).map(x =>
      [x.user_id, `${x.nombre} ${x.apellido}`]
    ));

    const rows = rawTurnos.map(t => ({
      Fecha:        t.fecha,
      Hora:         t.hora,
      Especialidad: t.especialidad,
      Profesional:  mapEsp.get(t.especialista_id) ?? 'Desconocido'
    }));

    const headers = ['Fecha','Hora','Especialidad','Profesional'];
    const ws = XLSX.utils.json_to_sheet(rows,{ header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Turnos Realizados');
    XLSX.writeFile(wb,
      `turnos_realizados_${p.nombre.toLowerCase()}_${p.apellido.toLowerCase()}.xlsx`
    );
  }

    private async loadLoginLogs() {
    const { data } = await this['supaService']
      .from('login_logs')
      .select('user_id, timestamp');
    this.logsDataSource.data = data || [];
  }

   /** Navega a la sección de estadísticas */
  goToStats() {
    this.router.navigate(['/admin/estadisticas']);
  }
    
    goBack(): void {
    this.location.back();
  }
}

