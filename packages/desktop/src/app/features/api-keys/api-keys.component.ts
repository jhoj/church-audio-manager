import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ApiService, ApiKey } from '../../core/api.service';
import { IconComponent } from '../../shared/icon.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [FormsModule, SlicePipe, IconComponent, ConfirmDialogComponent],
  template: `
    <div class="page-header">
      <h1>API Keys</h1>
      <button class="btn btn-icon btn-primary" title="Generate Key" (click)="openNew()"><app-icon name="plus" [size]="18" /></button>
    </div>

    <p style="color:#888;font-size:14px;margin-bottom:16px;">
      API keys give the embeddable website widget read-only access to published tracks.
      Add a key per website. Place it in the <code>data-api-key</code> attribute of the script tag.
    </p>

    <div class="card" style="padding:0;overflow:hidden">
      <table>
        <thead><tr><th>Label</th><th>Key</th><th>Created</th><th></th></tr></thead>
        <tbody>
          @for (k of keys(); track k.id) {
            <tr style="cursor:pointer;" [style.background]="selectedKeyId() === k.id ? 'rgba(99,208,223,0.08)' : ''" (click)="selectedKeyId.set(k.id)">
              <td>{{ k.label }}</td>
              <td>
                <code style="font-size:13px;background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">{{ k.key }}</code>
                <button class="btn btn-icon btn-ghost" style="margin-left:6px;width:28px;height:28px;" (click)="copy(k.key, k.id)" title="Copy">
                  <app-icon [name]="copiedId() === k.id ? 'check' : 'copy'" [size]="14" [style.color]="copiedId() === k.id ? 'var(--success)' : ''" />
                </button>
              </td>
              <td style="color:#888;font-size:13px;">{{ k.createdAt | slice:0:10 }}</td>
              <td>
                <button class="btn btn-icon btn-danger" (click)="remove(k.id)" title="Revoke"><app-icon name="trash" [size]="16" /></button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Embed snippet helper -->
    @if (keys().length > 0) {
      <div class="card" style="margin-top:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <h3 style="font-size:15px;font-weight:600;">Embed snippet</h3>
          <button class="btn btn-icon btn-ghost" style="width:28px;height:28px;" (click)="copy(snippet, 'snippet')" title="Copy snippet">
            <app-icon [name]="copiedId() === 'snippet' ? 'check' : 'copy'" [size]="14" [style.color]="copiedId() === 'snippet' ? 'var(--success)' : ''" />
          </button>
        </div>
        <p style="font-size:13px;color:#888;margin-bottom:8px;">
          Showing snippet for <strong style="color:var(--text);">{{ selectedLabel }}</strong>. Click a row above to switch.
        </p>
        <pre style="background:#1B1B1B;border:1px solid #333;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;color:#e0e0e0;">{{ snippet }}</pre>
      </div>
    }

    @if (modalOpen()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>New API Key</h2>
            <button class="modal-close" (click)="closeModal()">×</button>
          </div>
          <div class="form-group">
            <label>Label (e.g. "Main Website")</label>
            <input [(ngModel)]="newLabel" placeholder="Main Website" />
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="generate()">Generate</button>
          </div>
        </div>
      </div>
    }

    <app-confirm-dialog
      [open]="!!revokeTarget()"
      title="Revoke API Key"
      message="The widget using this key will stop working. This cannot be undone."
      confirmLabel="Revoke"
      variant="danger"
      icon="key"
      (confirmed)="confirmRevoke()"
      (cancelled)="revokeTarget.set(null)" />
  `,
})
export class ApiKeysComponent implements OnInit {
  private api = inject(ApiService);
  keys = signal<ApiKey[]>([]);
  modalOpen = signal(false);
  copiedId = signal<string | null>(null);
  revokeTarget = signal<string | null>(null);
  selectedKeyId = signal<string | null>(null);
  newLabel = '';

  get snippet(): string {
    const keys = this.keys();
    const selected = this.selectedKeyId();
    const k = keys.find(x => x.id === selected) ?? keys[0];
    if (!k) return '';
    return `<script src="https://cdn.yourchurch.com/church-audio-widget.iife.js"\n  data-api-url="https://api.yourchurch.com"\n  data-api-key="${k.key}"\n  data-container-id="church-audio-widget">\n</script>\n<div id="church-audio-widget"></div>`;
  }

  get selectedLabel(): string {
    const keys = this.keys();
    const selected = this.selectedKeyId();
    const k = keys.find(x => x.id === selected) ?? keys[0];
    return k?.label ?? '';
  }

  ngOnInit() { this.load(); }
  load() { this.api.getApiKeys().subscribe(k => this.keys.set(k)); }

  openNew()    { this.newLabel = ''; this.modalOpen.set(true); }
  closeModal() { this.modalOpen.set(false); }

  generate() {
    if (!this.newLabel.trim()) return;
    this.api.createApiKey(this.newLabel).subscribe(() => { this.closeModal(); this.load(); });
  }

  remove(id: string) { this.revokeTarget.set(id); }

  confirmRevoke() {
    const id = this.revokeTarget();
    if (!id) return;
    this.revokeTarget.set(null);
    this.api.deleteApiKey(id).subscribe(() => this.load());
  }

  copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    this.copiedId.set(id);
    setTimeout(() => this.copiedId.set(null), 2000);
  }
}
