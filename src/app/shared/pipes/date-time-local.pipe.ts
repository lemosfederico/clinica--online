// 4. DateTimeLocalPipe (standalone)
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dateTimeLocal',
  standalone: true
})
export class DateTimeLocalPipe implements PipeTransform {
  transform(value: string|Date): string {
    const d = new Date(value);
    const dd = d.getDate().toString().padStart(2,'0');
    const mm = (d.getMonth()+1).toString().padStart(2,'0');
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2,'0');
    const mi = d.getMinutes().toString().padStart(2,'0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
}