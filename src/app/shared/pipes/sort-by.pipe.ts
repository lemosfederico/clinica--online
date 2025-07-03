import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortBy',
  standalone: true
})
export class SortByPipe implements PipeTransform {
  /**
   * Ordena un array de objetos por una clave de propiedad.
   * @param value El array a ordenar.
   * @param field La propiedad por la que ordenar.
   * @param asc true para ascendente, false para descendente.
   * @returns Un nuevo array ordenado.
   */
  transform<T extends Record<string, any>>(value: T[] | null | undefined, field: string, asc: boolean = true): T[] | null {
    if (!Array.isArray(value) || !field) {
      return value || null;
    }

    // Copiamos el array para no mutar el original
    const sorted = [...value];

    sorted.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      // Valores nulos o indefinidos al final
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return asc ? 1 : -1;
      if (bVal == null) return asc ? -1 : 1;

      // Si ambos son strings, usamos localeCompare
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      // Para valores numéricos u otros comparables
      if (aVal > bVal) return asc ? 1 : -1;
      if (aVal < bVal) return asc ? -1 : 1;
      return 0;
    });

    return sorted;
  }
}
