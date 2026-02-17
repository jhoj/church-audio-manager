import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">Church Audio</div>
        <nav class="sidebar-nav">
          <a routerLink="/tracks"   routerLinkActive="active">&#127911; Tracks</a>
          <a routerLink="/speakers" routerLinkActive="active">&#127908; Speakers</a>
          <a routerLink="/series"   routerLinkActive="active">&#128218; Series</a>
          <a routerLink="/api-keys" routerLinkActive="active">&#128273; API Keys</a>
        </nav>
        <div style="margin-top:auto; padding: 16px;">
          <button class="btn btn-ghost" style="width:100%" (click)="logout()">Sign out</button>
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
