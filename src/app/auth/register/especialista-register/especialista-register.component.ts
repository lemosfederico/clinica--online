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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';
import { environment }             from '../../../../environments/environment';

import { SupabaseService }         from '../../../core/supabase.service';

@Component({
  standalone: true,
  selector: 'app-especialista-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
    RecaptchaFormsModule,
    RecaptchaModule
  ],
  templateUrl: './especialista-register.component.html',
  styleUrls: ['./especialista-register.component.scss']
})
export class EspecialistaRegisterComponent implements OnInit {
  siteKey = environment.recaptcha.siteKey;
  loading = false;
  error   = '';
  specialtyError = false;

  predefinedList = [
    { key: 'cardiologia',  label: 'Cardiología' },
    { key: 'dermatologia', label: 'Dermatología' },
    { key: 'neurologia',   label: 'Neurología' },
    { key: 'pediatria',    label: 'Pediatría' }
  ];

  form = this.fb.group({
    nombre:           ['', [Validators.required, Validators.minLength(3)]],
    apellido:         ['', [Validators.required, Validators.minLength(3)]],
    edad:             [null, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.min(18), Validators.max(120)]],
    dni:              [null, [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.minLength(7), Validators.maxLength(9)]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword:  ['', [Validators.required]],
    predefinedSpecs:  this.fb.group({
      cardiologia:  [false],
      dermatologia: [false],
      neurologia:   [false],
      pediatria:    [false]
    }),
    customSpecialty:  [''],
    profileImage:     [null, [Validators.required]],
    recaptcha:        ['', [Validators.required]]
  }, {
    validators: grp => {
      const p = grp.get('password')!;
      const c = grp.get('confirmPassword')!;
      return p.value === c.value ? null : { mismatch: true };
    }
  });

  constructor(
    private fb: FormBuilder,
    private supa: SupabaseService,
    private router: Router,
    private snack: MatSnackBar
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

    // Armamos el array de especialidades
    const pre = this.form.value.predefinedSpecs as Record<string, boolean>;
    const selected = this.predefinedList
      .filter(s => pre[s.key])
      .map(s => s.label);

    const custom = (this.form.value.customSpecialty as string).trim();
    if (custom) selected.push(custom);

    // Validamos al menos una
    if (selected.length === 0) {
      this.specialtyError = true;
      this.loading = false;
      return;
    }

    // 1️⃣ Registro en Auth
    const { data: signUpData, error: signUpErr } = await this.supa.signUp(
      this.form.value.email!,
      this.form.value.password!
    );
    if (signUpErr || !signUpData.user) {
      this.error = signUpErr?.message ?? 'Error al registrar usuario';
      this.loading = false;
      return;
    }
    const userId = signUpData.user.id;

    // 2️⃣ Subo imagen al bucket 'avatars'
    const bucket = this.supa.getStorage().from('avatars');
    const file   = this.form.value.profileImage as unknown as File;
    const ext    = file.name.split('.').pop();
    const path   = `${userId}/profile.${ext}`;
    const { error: uploadErr } = await bucket.upload(path, file, { upsert: true });
    if (uploadErr) {
      this.error = uploadErr.message;
      this.loading = false;
      return;
    }
    const { data: { publicUrl } } = bucket.getPublicUrl(path);

    // 3️⃣ Inserto el perfil con el array de specialties
    const { error: insertErr } = await this.supa
      .from('profiles')
      .insert([{
        user_id:     userId,
        role:        'especialista',
        nombre:      this.form.value.nombre,
        apellido:    this.form.value.apellido,
        edad:        this.form.value.edad,
        dni:         this.form.value.dni,
        specialties: selected,
        image_urls:  [ publicUrl ]
      }]);

    if (insertErr) {
      this.error = insertErr.message;
      this.loading = false;
      return;
    }

    // 4️⃣ Éxito
    this.loading = false;
    this.router.navigateByUrl('/login');
  }
}
