import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AppPage = 'form' | 'records';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="global-head" [class.head-slim]="currentPage !== 'form'">
      <ng-container *ngIf="currentPage === 'form'">
        <div class="brand">
          <span class="logo">Pizza C Claude</span>
          <span class="sub"><strong>F3 · Варка моцареллы</strong> · Блок 07 ТП</span>
        </div>
      </ng-container>
      <nav class="head-nav">
        <button
          class="nav-link"
          [class.active]="currentPage === 'records'"
          type="button"
          (click)="navigate.emit('records')">
          Список записей
        </button>
        <button
          class="nav-link"
          [class.active]="currentPage === 'form'"
          type="button"
          (click)="navigate.emit('form')">
          Форма
        </button>
      </nav>
      <ng-container *ngIf="currentPage === 'form'">
        <div class="meta">
          <div>Линия <strong>Pizza C Claude</strong></div>
          <div>Стрейчмарины СМ-1 / СМ-2</div>
        </div>
      </ng-container>
    </header>
  `,
})
export class AppHeaderComponent {
  @Input() currentPage: AppPage = 'records';
  @Output() navigate = new EventEmitter<AppPage>();
}
