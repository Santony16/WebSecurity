import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Permission } from '../models/permission.model';
import { Role, RolePayload } from '../models/role.model';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roles`;

  async getRoles(): Promise<Role[]> {
    const roles = await firstValueFrom(this.http.get<Role[]>(this.apiUrl));

    return roles.map((role) => ({
      ...role,
      id: Number(role.id),
      permissions: (role.permissions || []).map((permission) => ({
        ...permission,
        id: Number(permission.id)
      }))
    }));
  }

  async getPermissions(): Promise<Permission[]> {
    const permissions = await firstValueFrom(
      this.http.get<Permission[]>(`${this.apiUrl}/permissions/all`)
    );

    return permissions.map((permission) => ({
      ...permission,
      id: Number(permission.id)
    }));
  }

  createRole(payload: RolePayload): Promise<Role> {
    return firstValueFrom(this.http.post<Role>(this.apiUrl, payload));
  }

  updateRole(id: number, payload: RolePayload): Promise<Role> {
    return firstValueFrom(this.http.put<Role>(`${this.apiUrl}/${id}`, payload));
  }

  deleteRole(id: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
    );
  }

  assignPermissions(roleId: number, permissionIds: number[]): Promise<{ message: string; role: Role }> {
    const normalizedPermissionIds = permissionIds
      .map((permissionId) => Number(permissionId))
      .filter((permissionId) => Number.isInteger(permissionId));

    return firstValueFrom(
      this.http.put<{ message: string; role: Role }>(
        `${this.apiUrl}/${roleId}/permissions`,
        { permissionIds: normalizedPermissionIds }
      )
    );
  }
}
