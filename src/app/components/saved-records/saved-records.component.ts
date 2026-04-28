import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BatchRecord } from '../../core/models/batch.model';

@Component({
  selector: 'app-saved-records',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './saved-records.component.html',
})
export class SavedRecordsComponent {
  @Input() savedRecords: BatchRecord[] = [];
  @Output() removeRecord = new EventEmitter<number>();

  fatLabel(v: string): string {
    return v === 'milk' ? 'мол.' : v === 'vegetable' ? 'раст.' : 'смеш.';
  }
}
