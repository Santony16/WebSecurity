import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/loginPage/loginPage.component').then(
        (m) => m.LoginPageComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    children: [
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products-page/products-page.component').then(
            (m) => m.ProductsPageComponent
          )
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/pages/users-page/users-page.component').then(
            (m) => m.UsersPageComponent
          )
      },
      {
        path: 'roles',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] },
        loadComponent: () =>
          import('./features/roles/pages/roles-page/roles-page.component').then(
            (m) => m.RolesPageComponent
          )
      },
      {
        path: 'audit',
        canActivate: [roleGuard],
        data: { roles: ['SuperAdmin'] },
        loadComponent: () =>
          import('./features/audit/pages/audit-page/audit-page.component').then(
            (m) => m.AuditPageComponent
          )
      }
    ]
  }
];
