import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'tracks', pathMatch: 'full' },
      { path: 'tracks',    loadComponent: () => import('./features/tracks/tracks.component').then(m => m.TracksComponent) },
      { path: 'speakers',  loadComponent: () => import('./features/speakers/speakers.component').then(m => m.SpeakersComponent) },
      { path: 'series',    loadComponent: () => import('./features/series/series.component').then(m => m.SeriesComponent) },
      { path: 'api-keys',  loadComponent: () => import('./features/api-keys/api-keys.component').then(m => m.ApiKeysComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
