import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <app-icon name="church" [size]="22" class="logo-icon" />
          <span class="logo-text">Church Audio</span>
        </div>
        <nav class="sidebar-nav">
          <a routerLink="/tracks"   routerLinkActive="active"><app-icon name="music"      [size]="20" class="nav-icon" /><span class="nav-label">Tracks</span></a>
          <a routerLink="/speakers" routerLinkActive="active"><app-icon name="users" [size]="20" class="nav-icon" /><span class="nav-label">Speakers</span></a>
          <a routerLink="/series"   routerLinkActive="active"><app-icon name="layers"     [size]="20" class="nav-icon" /><span class="nav-label">Series</span></a>
          <a routerLink="/api-keys" routerLinkActive="active"><app-icon name="key"        [size]="20" class="nav-icon" /><span class="nav-label">API Keys</span></a>
        </nav>
        <div class="sidebar-bottom">
          <button class="btn btn-icon btn-ghost" title="Sign out" (click)="logout()">
            <app-icon name="power" [size]="18" />
          </button>
        </div>
      </aside>
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  constructor(private auth: AuthService) {}
  logout() { this.auth.logout(); }
}
