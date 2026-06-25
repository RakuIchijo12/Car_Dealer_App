import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import { DashboardStats, Car } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  recent = signal<Car[]>([]);

  constructor(private cars: CarsService) {}

  ngOnInit() {
    this.cars.getStats().subscribe((s) => this.stats.set(s));
    this.cars.getRecent().subscribe((r) => this.recent.set(r));
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  }
}
