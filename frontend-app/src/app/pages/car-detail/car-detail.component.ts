import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import { ToastService } from '../../core/services/toast.service';
import { Car, CarStatus } from '../../core/models';
import {
  carGallery, carTitle, formatDate, formatPrice, humanize, onImgError,
} from '../../core/utils/format';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './car-detail.component.html',
  styleUrl: './car-detail.component.css',
})
export class CarDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carsSvc = inject(CarsService);
  private toast = inject(ToastService);

  readonly fmtPrice = formatPrice;
  readonly humanize = humanize;
  readonly formatDate = formatDate;
  readonly onImgError = onImgError;
  readonly statuses: CarStatus[] = ['available', 'reserved', 'sold'];

  car = signal<Car | null>(null);
  loading = signal(true);
  activeImage = signal(0);

  readonly gallery = computed(() => carGallery(this.car()));

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      void this.router.navigate(['/admin/cars']);
      return;
    }

    this.carsSvc.getOne(id).subscribe({
      next: (c) => {
        this.car.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Vehicle not found');
        void this.router.navigate(['/admin/cars']);
      },
    });
  }

  get title() {
    return carTitle(this.car());
  }

  get specs(): { label: string; value: string }[] {
    const c = this.car();
    if (!c) return [];

    const rows: { label: string; value: string | undefined }[] = [
      { label: 'Brand', value: c.make?.name },
      { label: 'Model', value: c.model },
      { label: 'Year', value: String(c.year) },
      { label: 'Body type', value: c.bodyType ? humanize(c.bodyType) : undefined },
      { label: 'Transmission', value: c.transmission ? humanize(c.transmission) : undefined },
      { label: 'Fuel type', value: c.fuelType ? humanize(c.fuelType) : undefined },
      { label: 'Engine', value: c.engine },
      { label: 'Drivetrain', value: c.driveTrain },
      { label: 'Seats', value: c.seats ? String(c.seats) : undefined },
      { label: 'Colour', value: c.color },
      {
        label: 'Plate ending',
        value: c.plateEnding !== undefined && c.plateEnding !== null ? String(c.plateEnding) : undefined,
      },
      { label: 'VIN', value: c.vin },
      { label: 'Location', value: c.location },
      { label: 'Added', value: formatDate(c.createdAt) },
      { label: 'Last updated', value: formatDate(c.updatedAt) },
    ];

    return rows.filter((r): r is { label: string; value: string } => !!r.value);
  }

  setStatus(status: CarStatus) {
    const car = this.car();
    if (!car || car.status === status) return;
    const previous = car.status;

    this.car.set({ ...car, status });
    this.carsSvc.setStatus(car.id, status).subscribe({
      next: () => this.toast.success(`Marked as ${status}`, this.title),
      error: () => {
        this.car.set({ ...car, status: previous });
        this.toast.error('Could not update status');
      },
    });
  }

  toggleFeatured() {
    const car = this.car();
    if (!car) return;
    const previous = !!car.featured;

    this.car.set({ ...car, featured: !previous });
    this.carsSvc.toggleFeatured(car.id).subscribe({
      next: (updated) => this.car.set({ ...car, featured: updated.featured }),
      error: () => {
        this.car.set({ ...car, featured: previous });
        this.toast.error('Could not update featured status');
      },
    });
  }

  remove() {
    const car = this.car();
    if (!car) return;
    if (!confirm(`Delete ${this.title}? This also removes its photos and cannot be undone.`)) return;

    this.carsSvc.delete(car.id).subscribe({
      next: () => {
        this.toast.success('Vehicle deleted', this.title);
        void this.router.navigate(['/admin/cars']);
      },
      error: () => this.toast.error('Could not delete the vehicle'),
    });
  }
}
