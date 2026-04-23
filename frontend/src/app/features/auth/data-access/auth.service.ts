import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LoginRequest } from '../models/loginRequest.models';
import { LoginResponse } from '../models/loginResponse.models';
import { ProfileResponse } from '../models/session-user.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(payload: LoginRequest): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, payload)
    );
  }

  logout(): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${this.apiUrl}/auth/logout`, {})
    );
  }

  getProfile(): Promise<ProfileResponse> {
    return firstValueFrom(
      this.http.get<ProfileResponse>(`${this.apiUrl}/protected/profile`)
    );
  }
}
