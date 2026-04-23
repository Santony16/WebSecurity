import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../users/data-access/users.service';
import { User } from '../../../users/models/user.model';
import { AuditService } from '../../data-access/audit.service';
import { AuditLog } from '../../models/audit-log.model';

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-page.component.html',
  styleUrl: './audit-page.component.scss'
})
export class AuditPageComponent implements OnInit {
  private auditService = inject(AuditService);
  private usersService = inject(UsersService);

  logs: AuditLog[] = [];
  users: User[] = [];
  loading = true;
  filtersLoading = false;
  errorMessage = '';

  filters = {
    event_type: '',
    user_id: null as number | null,
    date_from: '',
    date_to: '',
    limit: 100
  };

  readonly eventTypes = [
    'PRODUCT_CREATED',
    'PRODUCT_UPDATED',
    'PRODUCT_DELETED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'ROLE_CHANGED',
    'PERMISSION_CHANGED'
  ];

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  get errorLogCount(): number {
    return this.logs.filter((log) => (log.status_code || 0) >= 400).length;
  }

  get uniqueUsersCount(): number {
    return new Set(this.logs.map((log) => log.user_id).filter((id) => id !== null)).size;
  }

  async loadInitialData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [users, logs] = await Promise.all([
        this.usersService.getUsers(),
        this.auditService.getAuditLogs({ limit: this.filters.limit })
      ]);
      this.users = users;
      this.logs = logs;
    } catch (error) {
      console.error('Error cargando auditoria:', error);
      this.errorMessage = 'No se pudo cargar la auditoria.';
    } finally {
      this.loading = false;
    }
  }

  async applyFilters(): Promise<void> {
    this.filtersLoading = true;
    this.errorMessage = '';

    try {
      this.logs = await this.auditService.getAuditLogs({
        event_type: this.filters.event_type || undefined,
        user_id: this.filters.user_id || undefined,
        date_from: this.filters.date_from || undefined,
        date_to: this.filters.date_to || undefined,
        limit: this.filters.limit
      });
    } catch (error: any) {
      console.error('Error filtrando auditoria:', error);
      this.errorMessage = error?.error?.message || 'No se pudo aplicar el filtro.';
    } finally {
      this.filtersLoading = false;
    }
  }

  async resetFilters(): Promise<void> {
    this.filters = {
      event_type: '',
      user_id: null,
      date_from: '',
      date_to: '',
      limit: 100
    };
    await this.applyFilters();
  }

  resolveUsername(userId: number | null): string {
    if (!userId) {
      return 'Sistema';
    }

    return this.users.find((user) => user.id === userId)?.username || `Usuario #${userId}`;
  }

  formatDetails(details: Record<string, unknown> | null): string {
    return details ? JSON.stringify(details) : 'Sin detalles';
  }
}
