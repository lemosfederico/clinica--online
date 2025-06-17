import { Component, Inject }      from '@angular/core';
import { CommonModule }           from '@angular/common';
import { MatButtonModule }        from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  standalone: true,
  selector: 'app-ver-resena-dialog',
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './ver-resena-dialog.component.html',
  styleUrls: ['./ver-resena-dialog.component.scss']
})
export class VerResenaDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<VerResenaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { comentario: string }
  ) {}
  
  cerrar() {
    this.dialogRef.close();
  }
}
