import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cars } from '../interface/cars';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarsService {
  private apiUrl = '/api/cars';

  constructor(private http: HttpClient) {}

  loadCars(): Observable<Cars[]> {
    const loadUrl = `${this.apiUrl}/get-all-cars`;
    return this.http.get<Cars[]>(loadUrl);
  }

  createCars(cars: Cars): Observable<Cars[]> {
    const createCarsUrl = `${this.apiUrl}/create-car`;
    return this.http.post<Cars[]>(createCarsUrl, cars);
  }

  deleteCar(carId: number): Observable<any> {
    const deleteCarUrl = `${this.apiUrl}/${carId}`;
    return this.http.delete(deleteCarUrl);
  }

  updateCar(carId: number, car: Cars): Observable<any> {
    const updateUrl = `${this.apiUrl}/${carId}`;
    return this.http.put(updateUrl, car);
  }
}
