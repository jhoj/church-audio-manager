import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, Series } from '../../core/api.service';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
    <div class="page-header">
      <h1>Series</h1>
      <button class="btn btn-primary" (click)="openNew()">+ Add Series</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Title</th><th>Description</th><th></th></tr></thead>
        <tbody>
          @for (s of series(); track s.id) {
            <tr>
              <td>{{ s.title }}</td>
              <td style="color:#888;font-size:13px;">{{ s.description | slice:0:80 }}{{ (s.description?.length ?? 0) > 80 ? '…' : '' }}</td>
              <td style="display:flex;gap:8px;">
                <button class="btn btn-ghost" (click)="openEdit(s)">Edit</button>
                <button class="btn btn-danger" (click)="remove(s.id)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (modalOpen()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editing() ? 'Edit Series' : 'New Series' }}</h2>
            <button class="modal-close" (click)="closeModal()">×</button>
          </div>
          <div class="form-group"><label>Title</label><input [(ngModel)]="form.title" /></div>
          <div class="form-group"><label>Description</label><textarea [(ngModel)]="form.description"></textarea></div>
          <div class="form-group"><label>Cover Image URL</label><input [(ngModel)]="form.coverUrl" /></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SeriesComponent implements OnInit {
  private api = inject(ApiService);
  series = signal<Series[]>([]);
  modalOpen = signal(false);
  editing = signal<Series | null>(null);
  form = { title: '', description: '', coverUrl: '' };

  ngOnInit() { this.load(); }
  load() { this.api.getSeries().subscribe(s => this.series.set(s)); }

  openNew()          { this.editing.set(null); this.form = { title: '', description: '', coverUrl: '' }; this.modalOpen.set(true); }
  openEdit(s: Series)  { this.editing.set(s); this.form = { title: s.title, description: s.description ?? '', coverUrl: s.coverUrl ?? '' }; this.modalOpen.set(true); }
  closeModal()       { this.modalOpen.set(false); }

  save() {
    const op = this.editing()
      ? this.api.updateSeries(this.editing()!.id, this.form)
      : this.api.createSeries(this.form);
    op.subscribe(() => { this.closeModal(); this.load(); });
  }

  remove(id: string) {
    if (!confirm('Delete series?')) return;
    this.api.deleteSeries(id).subscribe(() => this.load());
  }
}
