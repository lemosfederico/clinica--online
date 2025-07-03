import { Directive, Input, HostListener } from '@angular/core';
import * as XLSX from 'xlsx';

@Directive({
  selector: '[downloadExcel]',  // activa la directiva
  standalone: true
})
export class DownloadExcelDirective {
  // ahora recibe tu array en [downloadExcelData]
  @Input('downloadExcelData') downloadExcelData: any[] = [];
  @Input() excelHeaders: string[] = [];
  @Input() excelFilename = 'data.xlsx';

  @HostListener('click') onClick() {
    const ws = XLSX.utils.json_to_sheet(this.downloadExcelData, { header: this.excelHeaders });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Informe');
    XLSX.writeFile(wb, this.excelFilename);
  }
}
