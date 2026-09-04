import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Lead, LeadStats, LeadStatus } from '../models';

@Injectable({ providedIn: 'root' })
export class LeadsService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/leads`;

  getAll(filters: { status?: string; search?: string } = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params = params.set(k, v);
    });
    return this.http.get<Lead[]>(this.url, { params });
  }

  getStats() {
    return this.http.get<LeadStats>(`${this.url}/stats`);
  }

  update(id: number, data: { status?: LeadStatus; notes?: string }) {
    return this.http.patch<Lead>(`${this.url}/${id}`, data);
  }

  delete(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
