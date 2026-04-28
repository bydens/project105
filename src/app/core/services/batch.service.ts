import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BatchRecord, PbBatchRecord, PbListParams, PbListResponse } from '../models/batch.model';

const COLLECTION = '/api/collections/f3_stretch_logs/records';

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly base = `${environment.pbUrl}${COLLECTION}`;

  constructor(private http: HttpClient) {}

  // ── Read ─────────────────────────────────────────────────────────────

  getList(params?: PbListParams): Observable<PbListResponse<PbBatchRecord>> {
    let p = new HttpParams();
    if (params?.page      !== undefined) p = p.set('page',      params.page);
    if (params?.perPage   !== undefined) p = p.set('perPage',   params.perPage);
    if (params?.sort)                    p = p.set('sort',      params.sort);
    if (params?.filter)                  p = p.set('filter',    params.filter);
    if (params?.fields)                  p = p.set('fields',    params.fields);
    if (params?.skipTotal !== undefined) p = p.set('skipTotal', params.skipTotal ? '1' : '0');
    return this.http.get<PbListResponse<PbBatchRecord>>(this.base, { params: p });
  }

  getOne(id: string): Observable<PbBatchRecord> {
    return this.http.get<PbBatchRecord>(`${this.base}/${id}`);
  }

  // ── Write ─────────────────────────────────────────────────────────────

  create(record: BatchRecord): Observable<PbBatchRecord> {
    return this.http.post<PbBatchRecord>(this.base, record);
  }

  update(id: string, record: Partial<BatchRecord>): Observable<PbBatchRecord> {
    return this.http.patch<PbBatchRecord>(`${this.base}/${id}`, record);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ── Local export ──────────────────────────────────────────────────────

  downloadJson(records: PbBatchRecord[]): void {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `F3_strech_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
