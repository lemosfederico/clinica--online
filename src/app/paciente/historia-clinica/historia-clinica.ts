// src/app/paciente/mi-perfil-paciente/mi-perfil-paciente.component.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { jsPDF }             from 'jspdf';
import { MatCardModule }     from '@angular/material/card';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Location }          from '@angular/common';

import { SupabaseService }   from '../../core/supabase.service';
import { AuthService }       from '../../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-historia-clinica',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './historia-clinica.html',
  styleUrls: ['./historia-clinica.scss']
})
export class MiPerfilPacienteComponent implements OnInit {
  /** la historia clínica vinculada al turno actual */
  historia: {
    id: string;
    turno_id: number;
    altura: number;
    peso: number;
    temperatura: number;
    presion: string;
    fecha_creacion: string;
    historia_detalles: { clave: string; valor: string }[];
  } | null = null;

  profile: { nombre: string; apellido: string } | null = null;
  turnoId!: number;

  constructor(
    private supa: SupabaseService,
    private auth: AuthService,
    private snack: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  async ngOnInit(): Promise<void> {
    // 1) chequeo sesión
    const user = await this.auth.currentUser();
    if (!user) {
      this.snack.open('Debes iniciar sesión', 'Cerrar', { duration: 3000 });
      this.router.navigateByUrl('/login');
      return;
    }

    // 2) leo turnoId de los query params
    const qp = this.route.snapshot.queryParams;
    this.turnoId = qp['turnoId'] ? +qp['turnoId'] : NaN;
    if (isNaN(this.turnoId)) {
      this.snack.open('Turno inválido', 'Cerrar', { duration: 3000 });
      this.location.back();
      return;
    }

    // 3) cargo la historia clínica asociada a ese turno
    const { data: hData, error: hErr } = await this.supa
      .from('historia_clinica')
      .select(`
        id,
        turno_id,
        altura,
        peso,
        temperatura,
        presion,
        fecha_creacion,
        historia_detalles ( clave, valor )
      `)
      .eq('turno_id', this.turnoId)
      .single();

    if (hErr) {
      this.snack.open('Error al cargar historia: ' + hErr, 'Cerrar', { duration: 3000 });
    } else {
      this.historia = hData;
    }

    // 4) cargo perfil para nombre y apellido del paciente
    const { nombre, apellido } = await this.supa.getProfile(user.id);
    this.profile = { nombre, apellido };
  }

  async downloadPDF() {
    if (!this.historia || !this.profile) return;
    const doc = new jsPDF();
    const img = new Image();
    img.src = '/assets/icono-clinica.jpg';

    img.onload = () => {
      const logoWidth  = 50;
      const logoHeight = (img.height / img.width) * logoWidth;
      const pageWidth  = doc.internal.pageSize.getWidth();
      const xPos       = (pageWidth - logoWidth) / 2;

      doc.addImage(img, 'PNG', xPos, 10, logoWidth, logoHeight);

      const titleY = 10 + logoHeight + 8;
      doc.setFontSize(18);
      doc.text('Informe de Historia Clínica', pageWidth / 2, titleY, { align: 'center' });

      doc.setFontSize(11);
      doc.text(
        `Fecha de emisión: ${new Date(this.historia!.fecha_creacion).toLocaleDateString()}`,
        pageWidth / 2,
        titleY + 8,
        { align: 'center' }
      );

      const contentY = titleY + 20;
      doc.setFontSize(12);
      doc.text(`Paciente: ${this.profile!.nombre} ${this.profile!.apellido}`, 15, contentY);
      doc.text(`Altura: ${this.historia!.altura} cm`, 15, contentY + 7);
      doc.text(`Peso: ${this.historia!.peso} kg`, 15, contentY + 14);
      doc.text(`Temperatura: ${this.historia!.temperatura} °C`, 15, contentY + 21);
      doc.text(`Presión: ${this.historia!.presion}`, 15, contentY + 28);

      if (this.historia!.historia_detalles.length) {
        const detallesY = contentY + 40;
        doc.text('Detalles adicionales:', 15, detallesY);
        this.historia!.historia_detalles.forEach((d, i) => {
          doc.text(`${d.clave}: ${d.valor}`, 20, detallesY + 7 + i * 6);
        });
      }

      const fileName = `historia_${this.profile!.nombre}_${this.profile!.apellido}.pdf`;
      doc.save(fileName);
    };

    img.onerror = () => {
      this.snack.open('No se encontró el logo para el PDF', 'Cerrar', { duration: 3000 });
    };
  }

  goBack() {
    this.location.back();
  }
}
