import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Product, ProductPayload } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/products`;

  async getProducts(): Promise<Product[]> {
    return firstValueFrom(this.http.get<Product[]>(this.apiUrl));
  }

  async createProduct(payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(this.apiUrl, payload));
  }

  async updateProduct(id: number, payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.put<Product>(`${this.apiUrl}/${id}`, payload));
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`)
    );
  }
}
