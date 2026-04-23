import { Permission } from './permission.model';

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface RolePayload {
  name: string;
  description: string;
}
