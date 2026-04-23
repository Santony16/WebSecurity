import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  protected sessionService = inject(SessionService);

  protected navigationItems = computed(() => {
    const user = this.sessionService.currentUser();

    if (!user) {
      return [];
    }

    const items = [
      { label: 'Productos', path: '/products' },
      { label: 'Usuarios', path: '/users' }
    ];

    if (user.role === 'SuperAdmin') {
      items.push(
        { label: 'Roles', path: '/roles' },
        { label: 'Auditoria', path: '/audit' }
      );
    }

    return items;
  });

  protected async logout(): Promise<void> {
    await this.sessionService.logout();
  }
}
