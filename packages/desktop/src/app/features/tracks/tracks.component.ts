import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Speaker, Series, Track } from '../../core/api.service';
import { forkJoin } from 'rxjs';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-tracks',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Tracks</h1>
      <button class="btn btn-primary" (click)="openNew()">+ Add Track</button>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <select [(ngModel)]="filterPublished" (change)="load()">
        <option value="">All</option>
        <option value="true">Published</option>
        <option value="false">Drafts</option>
      </select>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead>
          <tr>
            <th>Title</th><th>Type</th><th>Speaker</th><th>Series</th><th>Date</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (t of tracks(); track t.id) {
            <tr>
              <td>{{ t.title }}</td>
              <td><span class="badge badge-{{ t.type.toLowerCase() }}">{{ t.type }}</span></td>
              <td>{{ t.speaker?.name ?? '—' }}</td>
              <td>{{ t.series?.title ?? '—' }}</td>
              <td>{{ t.recordedAt | slice:0:10 }}</td>
              <td>
                <span class="badge" [class]="t.isPublished ? 'badge-published' : 'badge-draft'">
                  {{ t.isPublished ? 'Published' : 'Draft' }}
                </span>
              </td>
              <td style="display:flex;gap:8px;">
                <button class="btn btn-ghost" (click)="openEdit(t)">Edit</button>
                <button class="btn btn-danger" (click)="remove(t.id)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="ca-pagination" style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
      <button class="btn btn-ghost" [disabled]="page() <= 1" (click)="changePage(-1)">← Prev</button>
      <span style="line-height:2.2;font-size:14px;">Page {{ page() }}</span>
      <button class="btn btn-ghost" [disabled]="tracks().length < 50" (click)="changePage(1)">Next →</button>
    </div>

    <!-- Modal -->
    @if (modalOpen()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editing() ? 'Edit Track' : 'New Track' }}</h2>
            <button class="modal-close" (click)="closeModal()">×</button>
          </div>

          <!-- File upload (new tracks only) -->
          @if (!editing()) {
            <div class="form-group">
              <label>Audio File</label>
              <div class="drop-zone" [class.over]="isDragging"
                (dragover)="$event.preventDefault(); isDragging=true"
                (dragleave)="isDragging=false"
                (drop)="onDrop($event)"
                (click)="fileInput.click()">
                {{ uploadState === 'idle' ? 'Click or drag audio file here' :
                   uploadState === 'uploading' ? 'Uploading…' :
                   uploadState === 'done' ? '✓ File uploaded' : '✗ Upload failed' }}
              </div>
              <input #fileInput type="file" accept="audio/*" style="display:none" (change)="onFileChange($event)" />
            </div>
          }

          <div class="form-group">
            <label>Title</label>
            <input [(ngModel)]="form.title" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select [(ngModel)]="form.type">
              <option>Sermon</option><option>Worship</option><option>Podcast</option><option>Announcement</option>
            </select>
          </div>
          <div class="form-group">
            <label>Speaker</label>
            <select [(ngModel)]="form.speakerId">
              <option value="">— None —</option>
              @for (s of speakers(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label>Series</label>
            <select [(ngModel)]="form.seriesId">
              <option value="">— None —</option>
              @for (s of series(); track s.id) { <option [value]="s.id">{{ s.title }}</option> }
            </select>
          </div>
          <div class="form-group">
            <label>Date Recorded</label>
            <input type="date" [(ngModel)]="form.recordedAt" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea [(ngModel)]="form.description"></textarea>
          </div>
          <div class="form-group">
            <label>Tags (comma-separated)</label>
            <input [(ngModel)]="form.tags" placeholder="prayer, youth, advent" />
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="published" [(ngModel)]="form.isPublished" style="width:auto" />
            <label for="published" style="margin:0">Publish immediately</label>
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TracksComponent implements OnInit {
  private api = inject(ApiService);

  tracks = signal<Track[]>([]);
  speakers = signal<Speaker[]>([]);
  series = signal<Series[]>([]);
  page = signal(1);
  modalOpen = signal(false);
  editing = signal<Track | null>(null);
  saving = signal(false);

  filterPublished = '';
  isDragging = false;
  uploadState: UploadState = 'idle';
  uploadedFileKey = '';

  form: {
    title: string; type: string; description: string; recordedAt: string;
    tags: string; speakerId: string; seriesId: string; isPublished: boolean;
  } = this.emptyForm();

  ngOnInit() {
    forkJoin({ speakers: this.api.getSpeakers(), series: this.api.getSeries() }).subscribe(r => {
      this.speakers.set(r.speakers);
      this.series.set(r.series);
    });
    this.load();
  }

  load() {
    const pub = this.filterPublished === '' ? undefined : this.filterPublished === 'true';
    this.api.getTracks(this.page(), pub).subscribe(r => this.tracks.set(r.items));
  }

  changePage(d: number) { this.page.update(p => p + d); this.load(); }

  openNew()       { this.editing.set(null); this.form = this.emptyForm(); this.uploadedFileKey = ''; this.uploadState = 'idle'; this.modalOpen.set(true); }
  openEdit(t: Track) { this.editing.set(t); this.form = { title: t.title, type: t.type, description: t.description ?? '', recordedAt: t.recordedAt.slice(0,10), tags: t.tags ?? '', speakerId: t.speaker?.id ?? '', seriesId: t.series?.id ?? '', isPublished: t.isPublished }; this.modalOpen.set(true); }
  closeModal()    { this.modalOpen.set(false); }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.upload(file);
  }

  private upload(file: File) {
    this.uploadState = 'uploading';
    this.api.uploadFile(file).subscribe({
      next: r => { this.uploadedFileKey = r.fileKey; this.uploadState = 'done'; },
      error: () => { this.uploadState = 'error'; },
    });
  }

  save() {
    if (!this.editing() && !this.uploadedFileKey) { alert('Please upload an audio file first.'); return; }
    this.saving.set(true);
    const body = {
      ...this.form,
      speakerId: this.form.speakerId || null,
      seriesId: this.form.seriesId || null,
      fileKey: this.uploadedFileKey || undefined,
    };
    const op = this.editing()
      ? this.api.updateTrack(this.editing()!.id, body)
      : this.api.createTrack(body as any);

    op.subscribe({ next: () => { this.closeModal(); this.load(); this.saving.set(false); }, error: () => this.saving.set(false) });
  }

  remove(id: string) {
    if (!confirm('Delete this track? This cannot be undone.')) return;
    this.api.deleteTrack(id).subscribe(() => this.load());
  }

  private emptyForm() {
    return { title: '', type: 'Sermon', description: '', recordedAt: new Date().toISOString().slice(0,10), tags: '', speakerId: '', seriesId: '', isPublished: false };
  }
}
