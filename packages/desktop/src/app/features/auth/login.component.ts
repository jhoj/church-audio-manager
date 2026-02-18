import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1B1B1B;">
      <div class="card" style="width:360px;">
        <h1 style="font-size:20px;font-weight:700;margin-bottom:4px;">Church Audio Manager</h1>
        <p style="color:#888;font-size:14px;margin-bottom:24px;">Sign in to continue</p>

        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>Username</label>
            <input type="text" [(ngModel)]="username" name="username" required autofocus />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required />
          </div>
          @if (error) {
            <p style="color:#e94560;font-size:13px;margin-bottom:12px;">{{ error }}</p>
          }
          <button class="btn btn-primary" style="width:100%" type="submit" [disabled]="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  private auth = inject(AuthService);
  private router = inject(Router);

  async submit() {
    this.loading = true;
    this.error = '';
    const ok = await this.auth.login(this.username, this.password);
    if (ok) {
      this.router.navigate(['/']);
    } else {
      this.error = 'Invalid username or password.';
    }
    this.loading = false;
  }
}
