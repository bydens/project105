import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-bar">
      <div class="id-block">Системный ID: <strong>{{ systemId }}</strong></div>
      <div class="id-block">Свободный ID: <strong>{{ freeId || '—' }}</strong></div>
      <div class="status-pill" [class.pill-edit]="editMode">{{ showPreview ? 'preview' : editMode ? 'edit' : 'draft' }}</div>
      <div class="autosave-ind">{{ autosaveText }}</div>
    </div>
  `,
})
export class StatusBarComponent {
  @Input() systemId    = '';
  @Input() freeId      = '';
  @Input() autosaveText = 'черновик · не сохранено';
  @Input() showPreview = false;
  @Input() editMode    = false;
}
