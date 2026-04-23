import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../services/session.service';

export const roleGuard: CanActivateFn = async (route) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  await sessionService.ensureInitialized();

  if (!sessionService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = Array.isArray(route.data['roles'])
    ? (route.data['roles'] as string[])
    : [];

  if (allowedRoles.length === 0 || sessionService.hasAnyRole(...allowedRoles)) {
    return true;
  }

  return router.createUrlTree(['/products']);
};
