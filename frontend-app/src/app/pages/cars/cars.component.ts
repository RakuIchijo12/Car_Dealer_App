import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CarsService } from '../../core/services/cars.service';
import { MakesService } from '../../core/services/makes.service';
import { ToastService } from '../../core/services/toast.service';
import { Car, CarStatus, Make } from '../../core/models';
import {
  carTitle, formatPrice, humanize, onImgError, photoUrl,
} from '../../core/utils/format';

type ViewMode = 'grid' | 'table';

@Component({
  selector: 'app-cars',
  standalone: true,
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './cars.component.html',
  styleUrl: './cars.component.css',
})
export class CarsComponent implements OnInit {
  private carsSvc = inject(CarsService);
  private makesSvc = inject(MakesService);
  private toast = inject(ToastService);

  readonly fmtPrice = formatPrice;
  readonly humanize = humanize;
  readonly photoUrl = photoUrl;
  readonly onImgError = onImgError;
  readonly carTitle = carTitle;
  readonly statuses: CarStatus[] = ['available', 'reserved', 'sold'];

  cars = signal<Car[]>([]);
  makes = signal<Make[]>([]);
  loading = signal(true);
  view = signal<ViewMode>(readView());

  filters = {
    search: '',
    makeId: '',
    status: '',
    yearMin: '',
    yearMax: '',
    priceMin: '',
    priceMax: '',
    sortBy: '',
    sortOrder: 'DESC',
  };

  private search$ = new Subject<string>();

  ngOnInit() {
    this.makesSvc.getAll().subscribe((m) => this.makes.set(m));
    this.search$.pipe(debounceTime(320), distinctUntilChanged()).subscribe(() => this.load());
    this.load();
  }

  load() {
    this.loading.set(true);
    this.carsSvc.getAll(this.filters).subscribe({
      next: (c) => {
        this.cars.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.cars.set([]);
        this.loading.set(false);
      },
    });
  }

  onSearch(value: string) {
    this.filters.search = value;
    this.search$.next(value);
  }

  setView(mode: ViewMode) {
    this.view.set(mode);
    try {
      localStorage.setItem('velora_cars_view', mode);
    } catch {
      /* storage blocked */
    }
  }

  resetFilters() {
    this.filters = {
      search: '', makeId: '', status: '', yearMin: '', yearMax: '',
      priceMin: '', priceMax: '', sortBy: '', sortOrder: 'DESC',
    };
    this.load();
  }

  get hasFilters(): boolean {
    const f = this.filters;
    return !!(f.search || f.makeId || f.status || f.yearMin || f.yearMax || f.priceMin || f.priceMax || f.sortBy);
  }

  /** Optimistic status change with rollback on failure. */
  setStatus(car: Car, status: CarStatus) {
    if (car.status === status) return;
    const previous = car.status;
    this.patch(car.id, { status });

    this.carsSvc.setStatus(car.id, status).subscribe({
      next: () => this.toast.success(`Marked as ${status}`, carTitle(car)),
      error: () => {
        this.patch(car.id, { status: previous });
        this.toast.error('Could not update status');
      },
    });
  }

  toggleFeatured(car: Car) {
    const previous = !!car.featured;
    this.patch(car.id, { featured: !previous });

    this.carsSvc.toggleFeatured(car.id).subscribe({
      next: (updated) => {
        this.patch(car.id, { featured: updated.featured });
        this.toast.success(
          updated.featured ? 'Added to featured' : 'Removed from featured',
          carTitle(car),
        );
      },
      error: () => {
        this.patch(car.id, { featured: previous });
        this.toast.error('Could not update featured status');
      },
    });
  }

  remove(car: Car) {
    if (!confirm(`Delete ${carTitle(car)}? This also removes its photos and cannot be undone.`)) {
      return;
    }
    this.carsSvc.delete(car.id).subscribe({
      next: () => {
        this.cars.update((list) => list.filter((c) => c.id !== car.id));
        this.toast.success('Vehicle deleted', carTitle(car));
      },
      error: () => this.toast.error('Could not delete the vehicle'),
    });
  }

  private patch(id: number, changes: Partial<Car>) {
    this.cars.update((list) => list.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }
}

function readView(): ViewMode {
  try {
    return localStorage.getItem('velora_cars_view') === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}
