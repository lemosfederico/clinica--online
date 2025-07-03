// 5. CountByPipe (standalone)
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'countBy',
  standalone: true,
  pure: true
})
export class CountByPipe implements PipeTransform {
  transform<T>(items: T[], field: string): { key: any; count: number }[] {
    const map = new Map<any,number>();
    items.forEach(i => {
      const k = (i as any)[field] ?? '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key,count])=>({ key, count }));
  }
}