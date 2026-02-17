import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    electronAPI?: {
      getToken(): Promise<string | null>;
      setToken(token: string | null): Promise<void>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Token is kept in memory; on startup we check Electron's IPC store
  private token: string | null = null;

  async init(): Promise<void> {
    if (window.electronAPI) {
      this.token = await window.electronAPI.getToken();
    } else {
      this.token = sessionStorage.getItem('auth_token');
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await this.http
        .post<{ token: string }>(`${environment.apiUrl}/api/admin/auth/login`, { username, password })
        .toPromise();
      if (!res) return false;
      this.token = res.token;
      await this.persistToken(res.token);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.token = null;
    await this.persistToken(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return this.token; }

  isAuthenticated(): boolean { return !!this.token; }

  private async persistToken(token: string | null): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.setToken(token);
    } else {
      if (token) sessionStorage.setItem('auth_token', token);
      else sessionStorage.removeItem('auth_token');
    }
  }
}
