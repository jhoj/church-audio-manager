import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, Speaker } from '../../core/api.service';

@Component({
  selector: 'app-speakers',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
    <div class="page-header">
      <h1>Speakers</h1>
      <button class="btn btn-primary" (click)="openNew()">+ Add Speaker</button>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Name</th><th>Bio</th><th></th></tr></thead>
        <tbody>
          @for (s of speakers(); track s.id) {
            <tr>
              <td>{{ s.name }}</td>
              <td style="color:#888;font-size:13px;">{{ s.bio | slice:0:80 }}{{ (s.bio?.length ?? 0) > 80 ? '…' : '' }}</td>
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
            <h2>{{ editing() ? 'Edit Speaker' : 'New Speaker' }}</h2>
            <button class="modal-close" (click)="closeModal()">×</button>
          </div>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" /></div>
          <div class="form-group"><label>Bio</label><textarea [(ngModel)]="form.bio"></textarea></div>
          <div class="form-group"><label>Photo URL</label><input [(ngModel)]="form.photoUrl" /></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SpeakersComponent implements OnInit {
  private api = inject(ApiService);
  speakers = signal<Speaker[]>([]);
  modalOpen = signal(false);
  editing = signal<Speaker | null>(null);
  form = { name: '', bio: '', photoUrl: '' };

  ngOnInit() { this.load(); }
  load() { this.api.getSpeakers().subscribe(s => this.speakers.set(s)); }

  openNew()          { this.editing.set(null); this.form = { name: '', bio: '', photoUrl: '' }; this.modalOpen.set(true); }
  openEdit(s: Speaker) { this.editing.set(s); this.form = { name: s.name, bio: s.bio ?? '', photoUrl: s.photoUrl ?? '' }; this.modalOpen.set(true); }
  closeModal()       { this.modalOpen.set(false); }

  save() {
    const op = this.editing()
      ? this.api.updateSpeaker(this.editing()!.id, this.form)
      : this.api.createSpeaker(this.form);
    op.subscribe(() => { this.closeModal(); this.load(); });
  }

  remove(id: string) {
    if (!confirm('Delete speaker?')) return;
    this.api.deleteSpeaker(id).subscribe(() => this.load());
  }
}
