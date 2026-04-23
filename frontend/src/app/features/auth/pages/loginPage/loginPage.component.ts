import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../data-access/auth.service';
import { SessionService } from '../../../../core/services/session.service';
import { sanitizeInput } from '../../../../core/utils/sanitize.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loginPage.component.html',
  styleUrl: './loginPage.component.scss'
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private sessionService = inject(SessionService);

  form = {
    identifier: '',
    password: ''
  };

  loading = false;
  errorMessage = '';
  successMessage = '';

  async onSubmit() {
    if (!this.form.identifier || !this.form.password) {
      this.errorMessage = 'Completa usuario y contrasena.';
      return;
    }

    const identifier = sanitizeInput(this.form.identifier);

    if (!identifier) {
      this.errorMessage = 'El usuario no puede estar vacio.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await this.authService.login({ identifier, password: this.form.password });
      this.sessionService.setSession(response.user);
      this.successMessage = `Bienvenida, ${response.user.username}`;
      await this.router.navigate(['/products']);
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || 'No se pudo iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}
