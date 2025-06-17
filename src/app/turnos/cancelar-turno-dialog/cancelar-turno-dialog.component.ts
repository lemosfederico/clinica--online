import { Component, Inject }       from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatFormFieldModule }      from '@angular/material/form-field';
import { MatInputModule }          from '@angular/material/input';
import { MatButtonModule }         from '@angular/material/button';
import { CommonModule }            from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

interface DialogData {
  turno: { id: number; };
}

@Component({
  standalone: true,
  selector: 'app-cancelar-turno-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './cancelar-turno-dialog.component.html',
  styleUrls: ['./cancelar-turno-dialog.component.scss']
})
export class CancelarTurnoDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CancelarTurnoDialogComponent, string>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      motivo: ['', Validators.required]
    });
  }

  cancelar() {
    this.dialogRef.close(); // sin motivo
  }

  confirmar() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value.motivo);
  }
}
