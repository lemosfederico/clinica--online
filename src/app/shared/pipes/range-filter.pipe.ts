// 6. RangeFilterPipe (standalone)
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'rangeFilter',
  standalone: true,
  pure: true
})
export class RangeFilterPipe implements PipeTransform {
  transform<T>(items: T[], field: string, start: Date, end: Date): T[] {
    return items.filter(i => {
      const d = new Date((i as any)[field]);
      return d >= start && d <= end;
    });
  }
}