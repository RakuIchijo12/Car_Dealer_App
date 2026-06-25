import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Car, DashboardStats } from '../models';

@Injectable({ providedIn: 'root' })
export class CarsService {
  private url = `${environment.apiUrl}/cars`;

  constructor(private http: HttpClient) {}

  getAll(filters: Record<string, any> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') params = params.set(k, v); });
    return this.http.get<Car[]>(this.url, { params });
  }

  getOne(id: number) { return this.http.get<Car>(`${this.url}/${id}`); }
  getStats() { return this.http.get<DashboardStats>(`${this.url}/stats`); }
  getRecent() { return this.http.get<Car[]>(`${this.url}/recent`); }

  create(data: FormData) { return this.http.post<Car>(this.url, data); }
  update(id: number, data: FormData) { return this.http.patch<Car>(`${this.url}/${id}`, data); }
  delete(id: number) { return this.http.delete(`${this.url}/${id}`); }
  markAsSold(id: number) { return this.http.patch<Car>(`${this.url}/${id}/sell`, {}); }
}
