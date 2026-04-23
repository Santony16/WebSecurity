import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RolesService } from '../../data-access/roles.service';
import { Permission } from '../../models/permission.model';
import { Role } from '../../models/role.model';

const SYSTEM_ROLE_NAMES = ['SuperAdmin', 'Auditor', 'Registrador'] as const;

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.scss'
})
export class RolesPageComponent implements OnInit {
  private rolesService = inject(RolesService);
  protected readonly systemRoleNames = [...SYSTEM_ROLE_NAMES];

  roles: Role[] = [];
  permissions: Permission[] = [];
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  editingRoleId: number | null = null;
  selectedPermissionIds: number[] = [];

  form = {
    name: '',
    description: ''
  };

  async ngOnInit(): Promise<void> {
    await this.loadPageData();
  }

  get totalPermissionAssignments(): number {
    return this.roles.reduce((total, role) => total + role.permissions.length, 0);
  }

  get allSystemRolesExist(): boolean {
    return this.systemRoleNames.every((roleName) => (
      this.roles.some((role) => role.name === roleName)
    ));
  }

  async loadPageData(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [roles, permissions] = await Promise.all([
        this.rolesService.getRoles(),
        this.rolesService.getPermissions()
      ]);
      this.roles = roles;
      this.permissions = permissions;
    } catch (error) {
      console.error('Error cargando roles:', error);
      this.errorMessage = 'No se pudieron cargar los roles y permisos.';
    } finally {
      this.loading = false;
    }
  }

  startCreate(): void {
    this.editingRoleId = null;
    this.selectedPermissionIds = [];
    this.form = { name: '', description: '' };
    this.successMessage = '';
    this.errorMessage = '';
  }

  startEdit(role: Role): void {
    this.editingRoleId = role.id;
    this.selectedPermissionIds = role.permissions
      .map((permission) => Number(permission.id))
      .filter((permissionId) => Number.isInteger(permissionId));
    this.form = {
      name: role.name,
      description: role.description || ''
    };
    this.successMessage = '';
    this.errorMessage = '';
  }

  togglePermission(permissionId: number | string, checked: boolean): void {
    const normalizedPermissionId = Number(permissionId);

    if (!Number.isInteger(normalizedPermissionId)) {
      return;
    }

    this.selectedPermissionIds = checked
      ? [...new Set([...this.selectedPermissionIds, normalizedPermissionId])]
      : this.selectedPermissionIds.filter((id) => id !== normalizedPermissionId);
  }

  isPermissionSelected(permissionId: number | string): boolean {
    const normalizedPermissionId = Number(permissionId);
    return Number.isInteger(normalizedPermissionId)
      && this.selectedPermissionIds.includes(normalizedPermissionId);
  }

  async saveRole(): Promise<void> {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name: this.form.name.trim(),
      description: this.form.description.trim()
    };

    const validationError = this.validateRolePayload(payload);
    const normalizedPermissionIds = this.selectedPermissionIds
      .map((permissionId) => Number(permissionId))
      .filter((permissionId) => Number.isInteger(permissionId));

    if (validationError) {
      this.errorMessage = validationError;
      this.saving = false;
      return;
    }

    if (normalizedPermissionIds.length !== this.selectedPermissionIds.length) {
      this.errorMessage = 'Uno o mas permisos seleccionados no son validos.';
      this.saving = false;
      return;
    }

    try {
      const savedRole = this.editingRoleId !== null
        ? await this.rolesService.updateRole(this.editingRoleId, payload)
        : await this.rolesService.createRole(payload);

      await this.rolesService.assignPermissions(savedRole.id, normalizedPermissionIds);
      await this.loadPageData();
      this.resetEditor(false);
      this.successMessage = this.editingRoleId !== null
        ? 'Rol actualizado correctamente.'
        : 'Rol creado correctamente.';
    } catch (error: any) {
      console.error('Error guardando rol:', error);
      this.errorMessage = error?.error?.message || 'No se pudo guardar el rol.';
    } finally {
      this.saving = false;
    }
  }

  async deleteRole(role: Role): Promise<void> {
    if (!this.canDeleteRole(role)) {
      this.errorMessage = 'Los roles base del sistema no se pueden eliminar.';
      return;
    }

    const confirmed = window.confirm(`Se eliminara el rol ${role.name}. Deseas continuar?`);

    if (!confirmed) {
      return;
    }

    try {
      await this.rolesService.deleteRole(role.id);
      this.successMessage = 'Rol eliminado correctamente.';
      await this.loadPageData();
    } catch (error: any) {
      console.error('Error eliminando rol:', error);
      this.errorMessage = error?.error?.message || 'No se pudo eliminar el rol.';
    }
  }

  canDeleteRole(role: Role): boolean {
    return !this.systemRoleNames.includes(role.name as (typeof SYSTEM_ROLE_NAMES)[number]);
  }

  private resetEditor(clearMessages = true): void {
    this.editingRoleId = null;
    this.selectedPermissionIds = [];
    this.form = { name: '', description: '' };

    if (clearMessages) {
      this.successMessage = '';
      this.errorMessage = '';
    }
  }

  private validateRolePayload(payload: { name: string; description: string }): string | null {
    if (payload.name.length === 0) {
      return 'El nombre del rol es obligatorio.';
    }

    if (!this.systemRoleNames.includes(payload.name as (typeof SYSTEM_ROLE_NAMES)[number])) {
      return `La base actual solo permite estos nombres de rol: ${this.systemRoleNames.join(', ')}.`;
    }

    if (
      this.editingRoleId === null
      && this.roles.some((role) => role.name === payload.name)
    ) {
      return 'Ese rol base ya existe. Edita el rol existente en lugar de crearlo de nuevo.';
    }

    return null;
  }
}
