export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface ProfileResponse {
  message: string;
  user: SessionUser;
}
