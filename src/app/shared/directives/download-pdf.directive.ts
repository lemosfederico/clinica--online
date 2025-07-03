// src/app/shared/directives/download-pdf.directive.ts

import { Directive, Input, HostListener, ElementRef } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF       from 'jspdf';

@Directive({
  selector: '[downloadPdf]',
  standalone: true
})
export class DownloadPdfDirective {
  /** Nombre de archivo final */
  @Input() downloadPdfFilename = 'export.pdf';

  /** Target real a capturar */
  @Input() downloadPdfTarget!: HTMLElement;

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('click')
  async onClick() {
    // 1) Decidir el elemento a capturar
    const targetEl = this.downloadPdfTarget || this.host.nativeElement;
    // 2) Renderizar a canvas
    const canvas = await html2canvas(targetEl, { useCORS: true, scale: 2 });
    // 3) Pasar a imagen
    const imgData = canvas.toDataURL('image/png');
    // 4) Crear PDF en modo landscape
    const pdf = new jsPDF({ orientation: 'landscape' });
    // 5) Ajustar imagen al ancho de página con márgenes
    const margin = 10;
    const pdfWidth  = pdf.internal.pageSize.getWidth() - margin * 2;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, pdfHeight);
    // 6) Descargar
    pdf.save(this.downloadPdfFilename);
  }
}
