import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, Series } from '../../core/api.service';
import { IconComponent } from '../../shared/icon.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [FormsModule, SlicePipe, IconComponent, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1>Series</h1>
      <button class="btn btn-icon btn-primary" title="Add Series" (click)="openNew()"><app-icon name="plus" [size]="18" /></button>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Title</th><th>Description</th><th></th></tr></thead>
        <tbody>
          @for (s of series(); track s.id) {
            <tr>
              <td>{{ s.title }}</td>
              <td style="color:#888;font-size:13px;">{{ s.description | slice:0:80 }}{{ (s.description?.length ?? 0) > 80 ? '…' : '' }}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-icon btn-ghost" (click)="openEdit(s)" title="Edit"><app-icon name="edit" [size]="16" /></button>
                <button class="btn btn-icon btn-danger" (click)="remove(s.id)" title="Delete"><app-icon name="trash" [size]="16" /></button>
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

    <app-confirm-dialog
      [open]="!!deleteTarget()"
      title="Delete Series"
      message="This series will be permanently removed."
      confirmLabel="Delete"
      variant="danger"
      icon="trash"
      (confirmed)="confirmDelete()"
      (cancelled)="deleteTarget.set(null)" />
  `,
})
export class SeriesComponent implements OnInit {
  private api = inject(ApiService);
  series = signal<Series[]>([]);
  modalOpen = signal(false);
  editing = signal<Series | null>(null);
  deleteTarget = signal<string | null>(null);
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

  remove(id: string) { this.deleteTarget.set(id); }

  confirmDelete() {
    const id = this.deleteTarget();
    if (!id) return;
    this.deleteTarget.set(null);
    this.api.deleteSeries(id).subscribe(() => this.load());
  }
}
