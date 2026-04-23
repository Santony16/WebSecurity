import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateUserPayload, UpdateUserPayload, User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsers(): Promise<User[]> {
    return firstValueFrom(this.http.get<User[]>(this.apiUrl));
  }

  createUser(payload: CreateUserPayload): Promise<User> {
    return firstValueFrom(this.http.post<User>(this.apiUrl, payload));
  }

  updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    return firstValueFrom(this.http.put<User>(`${this.apiUrl}/${id}`, payload));
  }

  deleteUser(id: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
    );
  }
}
