import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Customer } from '../models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private url = `${environment.apiUrl}/customers`;
  constructor(private http: HttpClient) {}
  getAll() { return this.http.get<Customer[]>(this.url); }
  create(data: Partial<Customer>) { return this.http.post<Customer>(this.url, data); }
  update(id: number, data: Partial<Customer>) { return this.http.patch<Customer>(`${this.url}/${id}`, data); }
  delete(id: number) { return this.http.delete(`${this.url}/${id}`); }
}
