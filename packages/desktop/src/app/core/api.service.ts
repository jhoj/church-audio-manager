import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Track {
  id: string; title: string; type: string; description: string | null;
  recordedAt: string; durationSeconds: number | null; tags: string | null;
  fileKey: string; isPublished: boolean;
  speaker: { id: string; name: string } | null;
  series: { id: string; title: string } | null;
}

export interface Speaker { id: string; name: string; bio: string | null; photoUrl: string | null; }
export interface Series  { id: string; title: string; description: string | null; coverUrl: string | null; }
export interface ApiKey  { id: string; key: string; label: string; isActive: boolean; createdAt: string; }

export interface Paged<T> { total: number; page: number; pageSize: number; items: T[]; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/api/admin';

  // ── Tracks ──────────────────────────────────────────────────────────────────
  getTracks(page = 1, published?: boolean): Observable<Paged<Track>> {
    let params = new HttpParams().set('page', page).set('pageSize', 50);
    if (published !== undefined) params = params.set('published', published);
    return this.http.get<Paged<Track>>(`${this.base}/tracks`, { params });
  }

  createTrack(body: Partial<Track> & { fileKey: string }): Observable<Track> {
    return this.http.post<Track>(`${this.base}/tracks`, body);
  }

  updateTrack(id: string, body: Partial<Track>): Observable<Track> {
    return this.http.put<Track>(`${this.base}/tracks/${id}`, body);
  }

  deleteTrack(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/tracks/${id}`);
  }

  uploadFile(file: File): Observable<{ fileKey: string; contentType: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ fileKey: string }>(`${this.base}/tracks/upload`, form);
  }

  // ── Speakers ────────────────────────────────────────────────────────────────
  getSpeakers(): Observable<Speaker[]>             { return this.http.get<Speaker[]>(`${this.base}/speakers`); }
  createSpeaker(b: Partial<Speaker>): Observable<Speaker> { return this.http.post<Speaker>(`${this.base}/speakers`, b); }
  updateSpeaker(id: string, b: Partial<Speaker>): Observable<Speaker> { return this.http.put<Speaker>(`${this.base}/speakers/${id}`, b); }
  deleteSpeaker(id: string): Observable<void>      { return this.http.delete<void>(`${this.base}/speakers/${id}`); }

  // ── Series ──────────────────────────────────────────────────────────────────
  getSeries(): Observable<Series[]>                { return this.http.get<Series[]>(`${this.base}/series`); }
  createSeries(b: Partial<Series>): Observable<Series>  { return this.http.post<Series>(`${this.base}/series`, b); }
  updateSeries(id: string, b: Partial<Series>): Observable<Series> { return this.http.put<Series>(`${this.base}/series/${id}`, b); }
  deleteSeries(id: string): Observable<void>       { return this.http.delete<void>(`${this.base}/series/${id}`); }

  // ── API Keys ─────────────────────────────────────────────────────────────────
  getApiKeys(): Observable<ApiKey[]>               { return this.http.get<ApiKey[]>(`${this.base}/api-keys`); }
  createApiKey(label: string): Observable<ApiKey>  { return this.http.post<ApiKey>(`${this.base}/api-keys`, { label }); }
  deleteApiKey(id: string): Observable<void>       { return this.http.delete<void>(`${this.base}/api-keys/${id}`); }
}
