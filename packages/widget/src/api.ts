import type { AudioType, PagedResult, Series, Speaker, Track } from './types';

export class ApiClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  private async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': this.apiKey },
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json() as Promise<T>;
  }

  getTracks(opts: {
    type?: AudioType;
    speakerId?: string;
    seriesId?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PagedResult<Track>> {
    return this.get('/api/public/tracks', {
      type: opts.type,
      speakerId: opts.speakerId,
      seriesId: opts.seriesId,
      tag: opts.tag,
      page: opts.page,
      pageSize: opts.pageSize,
    });
  }

  getSpeakers(): Promise<Speaker[]> {
    return this.get('/api/public/speakers');
  }

  getSeries(): Promise<Series[]> {
    return this.get('/api/public/series');
  }
}
