import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Car, CarStatus, DashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class CarsService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/cars`;

  getAll(filters: Record<string, unknown> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<Car[]>(this.url, { params });
  }

  getOne(id: number) {
    return this.http.get<Car>(`${this.url}/${id}`);
  }

  getStats() {
    return this.http.get<DashboardStats>(`${this.url}/stats`);
  }

  getRecent(limit = 5) {
    return this.http.get<Car[]>(`${this.url}/recent`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  create(data: FormData) {
    return this.http.post<Car>(this.url, data);
  }

  update(id: number, data: FormData) {
    return this.http.patch<Car>(`${this.url}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }

  markAsSold(id: number) {
    return this.http.patch<Car>(`${this.url}/${id}/sell`, {});
  }

  setStatus(id: number, status: CarStatus) {
    return this.http.patch<Car>(`${this.url}/${id}/status`, { status });
  }

  toggleFeatured(id: number) {
    return this.http.patch<Car>(`${this.url}/${id}/featured`, {});
  }

  removeImage(id: number, filename: string) {
    return this.http.delete<Car>(`${this.url}/${id}/images/${encodeURIComponent(filename)}`);
  }
}
