import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() balTotal         = 0;
  @Input() balIngredients   = 0;
  @Input() waterSum         = 0;
  @Input() returnableOk     = true;
  @Input() returnablePct    = 0;
  @Input() returnableKg     = 0;
  @Input() totPerevary      = 0;
  @Input() totFats          = 0;
  @Input() totEmuls         = 0;
  @Input() savedRecordsCount = 0;
  @Input() warnings: string[] = [];

  get balReturnableStr(): string {
    return `${this.returnablePct.toFixed(1)}% (${this.returnableKg.toFixed(1)} кг)`;
  }

  fmt(n: number, d = 1): string {
    return isFinite(n) ? n.toFixed(d) : '—';
  }
}
