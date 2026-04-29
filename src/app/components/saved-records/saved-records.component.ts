import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { BatchService } from '../../core/services/batch.service';
import { PbBatchRecord } from '../../core/models/batch.model';

@Component({
  selector: 'app-saved-records',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './saved-records.component.html',
})
export class SavedRecordsComponent implements OnInit {
  @Output() editRecord = new EventEmitter<string>();

  records: PbBatchRecord[] = [];
  loading = true;
  error = '';

  constructor(private batchSvc: BatchService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.batchSvc.getList({ sort: '-created', perPage: 100 }).subscribe({
      next:  (res) => { this.records = res.items; this.loading = false; },
      error: (err: unknown) => {
        const e = err as { status?: number; message?: string };
        this.error = `Ошибка загрузки: ${e.status ?? ''} ${e.message ?? ''}`.trim();
        this.loading = false;
      },
    });
  }

  remove(i: number): void {
    const rec = this.records[i];
    if (!confirm(`Удалить запись ${rec.system_id}?`)) return;
    this.batchSvc.delete(rec.id).subscribe({
      next:  () => { this.records.splice(i, 1); },
      error: (err: unknown) => {
        const e = err as { status?: number; message?: string };
        alert(`Не удалось удалить: ${e.status ?? ''} ${e.message ?? ''}`.trim());
      },
    });
  }

  downloadJson(): void { this.batchSvc.downloadJson(this.records); }

  fatLabel(v: string): string {
    return v === 'milk' ? 'мол.' : v === 'vegetable' ? 'раст.' : 'смеш.';
  }
}
