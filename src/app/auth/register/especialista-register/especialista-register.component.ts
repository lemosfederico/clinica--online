// src/app/auth/register/especialista-register/especialista-register.component.ts
import { Component, OnInit }       from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router }                  from '@angular/router';
import { CommonModule }            from '@angular/common';
import { ReactiveFormsModule }     from '@angular/forms';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatInputModule }          from '@angular/material/input';
import { MatButtonModule }         from '@angular/material/button';
import { MatCheckboxModule }       from '@angular/material/checkbox';
import { environment }             from '../../../../environments/environment';

import { SupabaseService }         from '../../../core/supabase.service';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  selector: 'app-especialista-register',
  templateUrl: './especialista-register.component.html',
  styleUrls: ['./especialista-register.component.scss']
})
export class EspecialistaRegisterComponent implements OnInit {
  siteKey = environment.recaptcha.siteKey;
  loading = false;
  error   = '';
  specialtyError = false;

  // listado de especialidades predefinidas
  predefinedList = [
    { key: 'cardiologia',  label: 'Cardiología' },
    { key: 'dermatologia', label: 'Dermatología' },
    { key: 'neurologia',   label: 'Neurología' },
    { key: 'pediatria',    label: 'Pediatría' }
  ];

  form = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(3)]],
    apellido:         ['', [Validators.required, Validators.minLength(3)]],
    edad:             [null, [Validators.required, Validators.min(18), Validators.max(120)]],
    dni:              [null, [Validators.required,Validators.pattern(/^\d+$/),Validators.minLength(7),Validators.maxLength(9)]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword:  ['', [Validators.required]],
    predefinedSpecs:  this.fb.group({
      cardiologia:  [false],
      dermatologia: [false],
      neurologia:   [false],
      pediatria:    [false]
    }),
    customSpecialty:  [''],                    // opcional
    profileImage:     [null, [Validators.required]],
    recaptcha:       ['', Validators.required]    // ≤ nuevo
  }, {
    validators: group => {
      const p = group.get('password')!;
      const c = group.get('confirmPassword')!;
      return p.value === c.value ? null : { mismatch: true };
    }
  });

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {}

  onFileChange(evt: any) {
    const file = evt.target.files?.[0] ?? null;
    this.form.get('profileImage')!.setValue(file);
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';
    this.specialtyError = false;

    if (this.form.invalid) return;
    const form = this.form.value;
    console.log('⚙️ Payload para signup:', {
    email: form.email,
    password: form.password
   });

      
    // armo el array de especialidades
    const præ = this.form.value.predefinedSpecs as Record<string, boolean>;
    const selected = this.predefinedList
      .filter(s => præ[s.key])
      .map(s => s.label);
    const custom = (this.form.value.customSpecialty as string).trim();
    if (custom) selected.push(custom);

    if (selected.length === 0) {
      this.specialtyError = true;
      this.loading = false;
      return;
    }

    const {
      nombre, apellido, edad, dni,
      email, password, profileImage
    } = this.form.value;

    // 1. signUp
    const { data, error } = await this.supa.signUp(email!, password!);
    if (error || !data.user) {
      this.error = error?.message || 'Error al registrar usuario';
      this.loading = false;
      return;
    }
    const userId = data.user.id;

    // 2. upload profileImage
    const bucket = this.supa.getStorage().from('avatars');
    const file   = profileImage as unknown as File;
    const ext    = file.name.split('.').pop();
    const path   = `${userId}/profile.${ext}`;
    await bucket.upload(path, file);
    const { data: { publicUrl } } = bucket.getPublicUrl(path);

    // 3. insert profile
    const { error: err2 } = await this.supa.getClient()
      .from('profiles')
      .insert([{
        user_id:     userId,
        role:        'especialista',
        nombre,
        apellido,
        edad,
        dni,
        specialties: selected,
        image_urls:  [ publicUrl ]
      }]);
    if (err2) {
      this.error = err2.message;
      this.loading = false;
      return;
    }

    // 4. redirect
    this.loading = false;
    this.router.navigateByUrl('/login');
  }
}
