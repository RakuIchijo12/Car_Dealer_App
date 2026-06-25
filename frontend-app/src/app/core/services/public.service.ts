import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Car, Make } from '../models';

export interface MakeWithCars extends Make {
  cars: Car[];
}

@Injectable({ providedIn: 'root' })
export class PublicService {
  private url = `${environment.apiUrl}/public`;

  constructor(private http: HttpClient) {}

  getCarsByMake() {
    return this.http.get<MakeWithCars[]>(`${this.url}/cars/by-make`);
  }

  getCars(makeId?: number, search?: string) {
    let q = '';
    if (makeId) q += `?makeId=${makeId}`;
    if (search) q += `${q ? '&' : '?'}search=${search}`;
    return this.http.get<Car[]>(`${this.url}/cars${q}`);
  }

  getMakes() {
    return this.http.get<Make[]>(`${this.url}/makes`);
  }
}
