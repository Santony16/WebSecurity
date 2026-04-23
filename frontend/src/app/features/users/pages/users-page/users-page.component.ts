import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../../../roles/data-access/roles.service';
import { Role } from '../../../roles/models/role.model';
import { SessionService } from '../../../../core/services/session.service';
import { UsersService } from '../../data-access/users.service';
import { User } from '../../models/user.model';
import { sanitizeInput } from '../../../../core/utils/sanitize.util';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss'
})
export class UsersPageComponent implements OnInit {
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  protected sessionService = inject(SessionService);

  users: User[] = [];
  roles: Role[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  editingUserId: number | null = null;
  form = this.buildEmptyForm();

  async ngOnInit(): Promise<void> {
    await this.loadPageData();
  }

  get isSuperAdmin(): boolean {
    return this.sessionService.hasAnyRole('SuperAdmin');
  }

  get activeUsersCount(): number {
    return this.users.filter((user) => user.is_active).length;
  }

  get inactiveUsersCount(): number {
    return this.users.length - this.activeUsersCount;
  }

  get recentLoginCount(): number {
    return this.users.filter((user) => user.last_login_at).length;
  }

  async loadPageData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const usersPromise = this.usersService.getUsers();
      const rolesPromise = this.isSuperAdmin ? this.rolesService.getRoles() : Promise.resolve([] as Role[]);
      const [users, roles] = await Promise.all([usersPromise, rolesPromise]);
      this.users = users;
      this.roles = roles;
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      this.errorMessage = 'No se pudieron cargar los usuarios.';
    } finally {
      this.loading = false;
    }
  }

  startCreate(): void {
    this.editingUserId = null;
    this.form = this.buildEmptyForm();
    this.successMessage = '';
    this.errorMessage = '';
  }

  startEdit(user: User): void {
    this.editingUserId = user.id;
    this.form = {
      username: user.username,
      email: user.email,
      password: '',
      roleId: user.role_id,
      isActive: user.is_active
    };
    this.successMessage = '';
    this.errorMessage = '';
  }

  async saveUser(): Promise<void> {
    if (!this.isSuperAdmin || !this.form.roleId) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      if (this.editingUserId !== null) {
        await this.usersService.updateUser(this.editingUserId, {
          username: sanitizeInput(this.form.username),
          email: sanitizeInput(this.form.email),
          password: this.form.password || undefined,
          roleId: this.form.roleId,
          isActive: this.form.isActive
        });
        this.successMessage = 'Usuario actualizado correctamente.';
      } else {
        await this.usersService.createUser({
          username: sanitizeInput(this.form.username),
          email: sanitizeInput(this.form.email),
          password: this.form.password,
          roleId: this.form.roleId
        });
        this.successMessage = 'Usuario creado correctamente.';
      }

      await this.loadPageData();
      this.startCreate();
    } catch (error: any) {
      console.error('Error guardando usuario:', error);
      this.errorMessage = error?.error?.message || 'No se pudo guardar el usuario.';
    } finally {
      this.saving = false;
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (!this.isSuperAdmin) {
      return;
    }

    const confirmed = window.confirm(`Se desactivara el usuario ${user.username}. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      await this.usersService.deleteUser(user.id);
      this.successMessage = 'Usuario desactivado correctamente.';
      await this.loadPageData();
    } catch (error: any) {
      console.error('Error desactivando usuario:', error);
      this.errorMessage = error?.error?.message || 'No se pudo desactivar el usuario.';
    }
  }

  private buildEmptyForm() {
    return {
      username: '',
      email: '',
      password: '',
      roleId: null as number | null,
      isActive: true
    };
  }
}
