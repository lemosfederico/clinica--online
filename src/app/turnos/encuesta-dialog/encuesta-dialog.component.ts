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
  selector: 'app-encuesta-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './encuesta-dialog.component.html',
  styleUrls: ['./encuesta-dialog.component.scss']
})
export class EncuestaDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EncuestaDialogComponent, string>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      encuesta: ['', Validators.required]
    });
  }

  cancelar() {
    this.dialogRef.close();
  }

  guardar() {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value.encuesta);
  }
}
