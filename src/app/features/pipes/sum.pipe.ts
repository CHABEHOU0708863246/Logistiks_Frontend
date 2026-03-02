import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sum'
})
export class SumPipe implements PipeTransform {
  transform(items: any[], property: string): number {
    if (!items || !property) {
      return 0;
    }
    return items.reduce((acc, item) => acc + (item[property] || 0), 0);
  }
}
