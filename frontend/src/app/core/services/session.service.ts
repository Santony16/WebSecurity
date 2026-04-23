import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { SessionUser } from '../../features/auth/models/session-user.model';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private currentUserSignal = signal<SessionUser | null>(null);
  private initializedSignal = signal(false);
  private initializationPromise: Promise<void> | null = null;

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly initialized = this.initializedSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  async ensureInitialized(): Promise<void> {
    if (this.initializedSignal()) {
      return;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = this.initializeSession();
    await this.initializationPromise;
  }

  setSession(user: SessionUser): void {
    this.currentUserSignal.set(user);
    this.initializedSignal.set(true);
  }

  clearSession(): void {
    this.currentUserSignal.set(null);
    this.initializedSignal.set(true);
  }

  hasAnyRole(...roles: string[]): boolean {
    const user = this.currentUserSignal();
    return !!user && roles.includes(user.role);
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } finally {
      this.clearSession();
      await this.router.navigate(['/login']);
    }
  }

  private async initializeSession(): Promise<void> {
    try {
      const response = await this.authService.getProfile();
      this.currentUserSignal.set(response.user);
    } catch {
      this.currentUserSignal.set(null);
    } finally {
      this.initializedSignal.set(true);
      this.initializationPromise = null;
    }
  }
}
