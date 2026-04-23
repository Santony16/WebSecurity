import { SessionUser } from './session-user.model';

export interface LoginResponse {
  message: string;
  user: SessionUser;
}
