export type AudioType = 'Sermon' | 'Worship' | 'Podcast' | 'Announcement';

export interface Speaker {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface Series {
  id: string;
  title: string;
  coverUrl: string | null;
}

export interface Track {
  id: string;
  title: string;
  type: AudioType;
  description: string | null;
  recordedAt: string;
  durationSeconds: number | null;
  tags: string | null;
  streamUrl: string;
  speaker: Speaker | null;
  series: Series | null;
}

export interface PagedResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface WidgetConfig {
  apiUrl: string;
  apiKey: string;
  containerId?: string;
  defaultType?: AudioType;
}
