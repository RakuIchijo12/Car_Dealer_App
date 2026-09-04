import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../models';

const TOKEN_KEY = 'velora_token';
const USER_KEY = 'velora_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly currentUser = signal<User | null>(readUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly initials = computed(() => {
    const name = this.currentUser()?.name?.trim();
    if (!name) return 'U';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  });

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          safeSet(TOKEN_KEY, res.access_token);
          safeSet(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }),
      );
  }

  logout(redirectTo: string = '/') {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
    this.currentUser.set(null);
    void this.router.navigateByUrl(redirectTo);
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch { /* storage blocked */ }
}
