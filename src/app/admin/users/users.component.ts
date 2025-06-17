import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
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

interface Profile {
  user_id:   string;
  nombre:    string;
  apellido:  string;
  edad:      number;
  dni:       string;
  //email:     string;
  role:      'especialista' | 'admin';
  approved:  boolean;
  image_urls?: string[];
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
    MatIconModule
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class AdminUsersComponent implements OnInit {
[x: string]: any;
  profiles: Profile[] = [];
  columns  = ['photos', 'nombre', 'apellido', 'edad', 'dni', 'role', 'approved', 'actions'];
  creatingForm: FormGroup;
  uploading = false;
    // Para los errores inline del avatar (si los quieres mostrar bajo el input)
  public avatarError = '';

  // Si luego usas <mat-error *ngIf="errorMessage">…
  public errorMessage = '';

  constructor(
    private supa: SupabaseService,
    private fb: FormBuilder,
    private errorSvc: ErrorService,
    private snack: MatSnackBar,
    private location: Location
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
    const { data, error } = await this.supa.from('profiles').select('*');
    if (error) {
      console.error('Error al cargar usuarios:', error);
      return;
    }
      this.profiles = data.map(p => ({
    ...p,
    photos: p.image_urls || []
  }));


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
  
    goBack(): void {
    this.location.back();
  }
}
