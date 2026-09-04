import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PublicService } from '../../core/services/public.service';
import { MAX_COMPARE, ShortlistService } from '../../core/services/shortlist.service';
import { Car } from '../../core/models';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import {
  carTitle, formatMileage, formatPrice, humanize, onImgError, photoUrl,
} from '../../core/utils/format';

interface CompareRow {
  label: string;
  values: string[];
  /** Index of the winning column, when one value is objectively better. */
  best?: number;
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [RouterLink, PublicNavComponent, PublicFooterComponent],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.css',
})
export class CompareComponent {
  private publicSvc = inject(PublicService);
  readonly shortlist = inject(ShortlistService);

  readonly fmtPrice = formatPrice;
  readonly carTitle = carTitle;
  readonly photoUrl = photoUrl;
  readonly onImgError = onImgError;

  cars = signal<Car[]>([]);
  loading = signal(true);

  constructor() {
    effect(() => {
      const ids = this.shortlist.compare();
      this.fetch(ids);
    });
  }

  private fetch(ids: number[]) {
    if (!ids.length) {
      this.cars.set([]);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    forkJoin(ids.map((id) => this.publicSvc.getCar(id).pipe(catchError(() => of(null))))).subscribe(
      (res) => {
        this.cars.set(res.filter((c): c is Car => c !== null));
        this.loading.set(false);
      },
    );
  }

  /**
   * Spec matrix. `best` highlights the strongest value for the metrics where
   * "better" is unambiguous — cheapest, newest, lowest mileage, most seats.
   */
  readonly rows = computed<CompareRow[]>(() => {
    const cars = this.cars();
    if (!cars.length) return [];

    const prices = cars.map((c) => Number(c.price));
    const years = cars.map((c) => c.year);
    const mileages = cars.map((c) => c.mileage ?? Number.MAX_SAFE_INTEGER);
    const seats = cars.map((c) => c.seats ?? 0);

    return [
      {
        label: 'Price',
        values: cars.map((c) => formatPrice(c.price)),
        best: indexOfMin(prices),
      },
      { label: 'Year', values: cars.map((c) => String(c.year)), best: indexOfMax(years) },
      {
        label: 'Mileage',
        values: cars.map((c) => formatMileage(c.mileage)),
        best: indexOfMin(mileages),
      },
      { label: 'Body type', values: cars.map((c) => humanize(c.bodyType)) },
      { label: 'Transmission', values: cars.map((c) => humanize(c.transmission)) },
      { label: 'Fuel type', values: cars.map((c) => humanize(c.fuelType)) },
      { label: 'Engine', values: cars.map((c) => c.engine ?? '—') },
      { label: 'Drivetrain', values: cars.map((c) => c.driveTrain ?? '—') },
      {
        label: 'Seats',
        values: cars.map((c) => (c.seats ? String(c.seats) : '—')),
        best: seats.some((s) => s > 0) ? indexOfMax(seats) : undefined,
      },
      { label: 'Colour', values: cars.map((c) => c.color ?? '—') },
      { label: 'Status', values: cars.map((c) => humanize(c.status)) },
      {
        label: 'Features',
        values: cars.map((c) => (c.features?.length ? `${c.features.length} listed` : '—')),
      },
    ];
  });

  /** Placeholder columns so the table always shows three slots. */
  readonly emptySlots = computed(() =>
    Array.from({ length: Math.max(MAX_COMPARE - this.cars().length, 0) }),
  );

  remove(id: number) {
    this.shortlist.toggleCompare(id);
  }

  clearAll() {
    this.shortlist.clearCompare();
  }
}

/** Index of the smallest value, or undefined when every value ties. */
function indexOfMin(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const min = Math.min(...values);
  if (values.every((v) => v === min)) return undefined;
  return values.indexOf(min);
}

function indexOfMax(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const max = Math.max(...values);
  if (values.every((v) => v === max)) return undefined;
  return values.indexOf(max);
}
