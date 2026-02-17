import { ApiClient } from './api';
import { CSS } from './styles';
import type { AudioType, Series, Speaker, Track, WidgetConfig } from './types';

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export class ChurchAudioWidget {
  private api: ApiClient;
  private root: HTMLElement;
  private audio: HTMLAudioElement | null = null;
  private currentTrack: Track | null = null;

  private page = 1;
  private total = 0;
  private pageSize = 10;
  private filterType: AudioType | '' = '';
  private filterSpeaker = '';
  private filterSeries = '';

  constructor(private config: WidgetConfig) {
    this.api = new ApiClient(config.apiUrl, config.apiKey);
    this.root = document.getElementById(config.containerId ?? 'church-audio-widget')!;
    if (!this.root) throw new Error(`[church-audio-widget] Container not found.`);

    this.injectStyles();
    this.render();
    this.boot();
  }

  private injectStyles() {
    if (document.getElementById('ca-styles')) return;
    const style = document.createElement('style');
    style.id = 'ca-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private async boot() {
    try {
      const [speakers, series] = await Promise.all([this.api.getSpeakers(), this.api.getSeries()]);
      this.renderFilters(speakers, series);
      await this.loadTracks();
    } catch {
      this.showError('Failed to load audio. Please try again later.');
    }
  }

  private render() {
    this.root.innerHTML = `
      <div class="ca-widget">
        <div id="ca-filters" class="ca-filters"></div>
        <div id="ca-track-list" class="ca-track-list"><p class="ca-loading">Loading…</p></div>
        <div id="ca-pagination" class="ca-pagination"></div>
        <div id="ca-player" class="ca-player">
          <div class="ca-player-title" id="ca-player-title"></div>
          <audio id="ca-audio" controls></audio>
        </div>
      </div>`;
    this.audio = this.root.querySelector('#ca-audio');
  }

  private renderFilters(speakers: Speaker[], series: Series[]) {
    const el = this.root.querySelector('#ca-filters')!;
    el.innerHTML = `
      <select id="ca-filter-type">
        <option value="">All Types</option>
        ${(['Sermon','Worship','Podcast','Announcement'] as AudioType[]).map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <select id="ca-filter-speaker">
        <option value="">All Speakers</option>
        ${speakers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <select id="ca-filter-series">
        <option value="">All Series</option>
        ${series.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
      </select>`;

    el.querySelector('#ca-filter-type')!.addEventListener('change', (e) => {
      this.filterType = (e.target as HTMLSelectElement).value as AudioType | '';
      this.page = 1;
      this.loadTracks();
    });
    el.querySelector('#ca-filter-speaker')!.addEventListener('change', (e) => {
      this.filterSpeaker = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.loadTracks();
    });
    el.querySelector('#ca-filter-series')!.addEventListener('change', (e) => {
      this.filterSeries = (e.target as HTMLSelectElement).value;
      this.page = 1;
      this.loadTracks();
    });
  }

  private async loadTracks() {
    const listEl = this.root.querySelector('#ca-track-list')!;
    listEl.innerHTML = '<p class="ca-loading">Loading…</p>';

    const result = await this.api.getTracks({
      type: this.filterType || undefined,
      speakerId: this.filterSpeaker || undefined,
      seriesId: this.filterSeries || undefined,
      page: this.page,
      pageSize: this.pageSize,
    });

    this.total = result.total;
    this.renderTracks(result.items);
    this.renderPagination();
  }

  private renderTracks(tracks: Track[]) {
    const el = this.root.querySelector('#ca-track-list')!;
    if (tracks.length === 0) { el.innerHTML = '<p class="ca-loading">No tracks found.</p>'; return; }

    el.innerHTML = tracks.map(t => `
      <div class="ca-track${this.currentTrack?.id === t.id ? ' ca-active' : ''}" data-id="${t.id}" data-url="${t.streamUrl}" data-title="${t.title}">
        <button class="ca-play-btn" aria-label="Play ${t.title}">&#9654;</button>
        <div class="ca-track-info">
          <div class="ca-track-title">${t.title}</div>
          <div class="ca-track-meta">
            <span class="ca-badge">${t.type}</span>
            ${t.speaker ? `${t.speaker.name} · ` : ''}${formatDate(t.recordedAt)}
            ${t.series ? ` · <em>${t.series.title}</em>` : ''}
          </div>
        </div>
        ${t.durationSeconds ? `<span class="ca-duration">${formatDuration(t.durationSeconds)}</span>` : ''}
      </div>`).join('');

    el.querySelectorAll<HTMLElement>('.ca-track').forEach(row => {
      row.addEventListener('click', () => this.play(row.dataset['id']!, row.dataset['url']!, row.dataset['title']!));
    });
  }

  private play(id: string, url: string, title: string) {
    if (!this.audio) return;
    this.audio.src = url;
    this.audio.play();

    const player = this.root.querySelector('#ca-player')!;
    player.classList.add('ca-visible');
    this.root.querySelector('#ca-player-title')!.textContent = title;

    // Update active state
    this.root.querySelectorAll('.ca-track').forEach(el => el.classList.remove('ca-active'));
    this.root.querySelector(`[data-id="${id}"]`)?.classList.add('ca-active');
  }

  private renderPagination() {
    const pages = Math.ceil(this.total / this.pageSize);
    const el = this.root.querySelector('#ca-pagination')!;
    el.innerHTML = `
      <button id="ca-prev" ${this.page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span style="line-height:2">Page ${this.page} of ${pages}</span>
      <button id="ca-next" ${this.page >= pages ? 'disabled' : ''}>Next →</button>`;

    el.querySelector('#ca-prev')?.addEventListener('click', () => { this.page--; this.loadTracks(); });
    el.querySelector('#ca-next')?.addEventListener('click', () => { this.page++; this.loadTracks(); });
  }

  private showError(msg: string) {
    this.root.innerHTML = `<div class="ca-error">${msg}</div>`;
  }
}
