import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (open) {
      <div class="modal-overlay" (click)="onCancel()">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <div class="confirm-icon" [class.danger]="variant === 'danger'">
            <app-icon [name]="icon" [size]="28" />
          </div>
          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message">{{ message }}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" (click)="onCancel()">Cancel</button>
            <button class="btn" [class.btn-danger]="variant === 'danger'" [class.btn-primary]="variant !== 'danger'" (click)="onConfirm()">
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-dialog {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px;
      width: 380px;
      text-align: center;
    }
    .confirm-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      background: rgba(99, 208, 223, 0.1);
      color: var(--primary);
    }
    .confirm-icon.danger {
      background: rgba(233, 69, 96, 0.12);
      color: var(--danger);
    }
    .confirm-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text);
    }
    .confirm-message {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .confirm-actions .btn {
      min-width: 100px;
    }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() variant: 'danger' | 'default' = 'danger';
  @Input() icon = 'trash';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() { this.confirmed.emit(); }
  onCancel() { this.cancelled.emit(); }
}
