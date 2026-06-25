import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Make } from '../models';

@Injectable({ providedIn: 'root' })
export class MakesService {
  private url = `${environment.apiUrl}/makes`;
  constructor(private http: HttpClient) {}
  getAll() { return this.http.get<Make[]>(this.url); }
  create(data: Partial<Make>) { return this.http.post<Make>(this.url, data); }
  update(id: number, data: Partial<Make>) { return this.http.patch<Make>(`${this.url}/${id}`, data); }
  delete(id: number) { return this.http.delete(`${this.url}/${id}`); }
}
