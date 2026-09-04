import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Car, Make, Paginated, PublicStats, Facets, InventoryFilters, CreateLead,
} from '../models';

export interface MakeWithCars extends Make {
  cars: Car[];
}

/** Storefront API — no auth required. */
@Injectable({ providedIn: 'root' })
export class PublicService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/public`;

  getMakes() {
    return this.http.get<Make[]>(`${this.url}/makes`);
  }

  getStats() {
    return this.http.get<PublicStats>(`${this.url}/stats`);
  }

  getFacets() {
    return this.http.get<Facets>(`${this.url}/cars/facets`);
  }

  getFeatured(limit = 6) {
    return this.http.get<Car[]>(`${this.url}/featured`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  /** Paginated inventory — empty/undefined filter values are dropped. */
  getCars(filters: InventoryFilters = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<Paginated<Car>>(`${this.url}/cars`, { params });
  }

  getCar(id: number) {
    return this.http.get<Car>(`${this.url}/cars/${id}`);
  }

  getSimilar(id: number) {
    return this.http.get<Car[]>(`${this.url}/cars/${id}/similar`);
  }

  getCarsByMake() {
    return this.http.get<MakeWithCars[]>(`${this.url}/cars/by-make`);
  }

  /** Enquiry / test-drive / trade-in submission. */
  submitLead(lead: CreateLead) {
    return this.http.post<{ success: boolean; id: number; message: string }>(
      `${this.url}/leads`,
      lead,
    );
  }
}
