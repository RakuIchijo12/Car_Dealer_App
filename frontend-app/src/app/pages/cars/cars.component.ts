import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CarsService } from '../../core/services/cars.service';
import { MakesService } from '../../core/services/makes.service';
import { Car, CarStatus, Make } from '../../core/models';

@Component({
  selector: 'app-cars',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cars.component.html',
  styleUrl: './cars.component.css',
})
export class CarsComponent implements OnInit {
  cars = signal<Car[]>([]);
  makes = signal<Make[]>([]);
  loading = signal(false);

  filters = { makeId: '', status: '', search: '', yearMin: '', yearMax: '', priceMin: '', priceMax: '', sortBy: '', sortOrder: 'DESC' };

  constructor(private carsSvc: CarsService, private makesSvc: MakesService) {}

  ngOnInit() {
    this.makesSvc.getAll().subscribe((m) => this.makes.set(m));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.carsSvc.getAll(this.filters).subscribe({ next: (c) => { this.cars.set(c); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  resetFilters() {
    this.filters = { makeId: '', status: '', search: '', yearMin: '', yearMax: '', priceMin: '', priceMax: '', sortBy: '', sortOrder: 'DESC' };
    this.load();
  }

  deleteCar(id: number) {
    if (!confirm('Delete this car?')) return;
    this.carsSvc.delete(id).subscribe(() => this.load());
  }

  markSold(id: number) {
    this.carsSvc.markAsSold(id).subscribe(() => this.load());
  }

  formatPrice(p: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);
  }

  photoUrl(photo: string | undefined) {
    return photo ? `http://localhost:3000/uploads/${photo}` : null;
  }
}
