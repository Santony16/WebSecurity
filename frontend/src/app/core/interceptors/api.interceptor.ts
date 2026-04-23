import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const request = isApiRequest ? req.clone({ withCredentials: true }) : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginRequest = req.url.includes('/auth/login');

      if (isApiRequest && error.status === 401 && !isLoginRequest) {
        sessionService.clearSession();

        if (router.url !== '/login') {
          void router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
