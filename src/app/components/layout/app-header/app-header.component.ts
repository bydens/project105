import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="global-head">
      <div class="brand">
        <span class="logo">Pizza C Claude</span>
        <span class="sub"><strong>F3 · Варка моцареллы</strong> · Блок 07 ТП</span>
      </div>
      <div class="meta">
        <div>Линия <strong>Pizza C Claude</strong></div>
        <div>Стрейчмарины СМ-1 / СМ-2</div>
      </div>
    </header>
  `,
})
export class AppHeaderComponent {}
