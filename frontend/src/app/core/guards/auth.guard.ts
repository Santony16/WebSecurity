import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const authGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  await sessionService.ensureInitialized();

  return sessionService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  await sessionService.ensureInitialized();

  return sessionService.isAuthenticated()
    ? router.createUrlTree(['/products'])
    : true;
};
