import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BatchRecord } from '../models/batch.model';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly url = `${environment.apiUrl}/batches`;

  constructor(private http: HttpClient) {}

  submit(record: BatchRecord): Observable<void> {
    return this.http.post<void>(this.url, record);
  }

  downloadJson(records: BatchRecord[]): void {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `F3_strech_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
