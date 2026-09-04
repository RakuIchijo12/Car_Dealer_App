import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PublicService } from '../../core/services/public.service';
import { ShortlistService } from '../../core/services/shortlist.service';
import { Car, Facets, InventoryFilters, Make } from '../../core/models';
import { BRAND } from '../../core/brand';
import { CarCardComponent } from '../../shared/car-card.component';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import { formatPriceShort, humanize } from '../../core/utils/format';

const DEFAULTS: InventoryFilters = {
  makeId: '', search: '', bodyType: '', transmission: '', fuelType: '',
  yearMin: '', yearMax: '', priceMin: '', priceMax: '', mileageMax: '', seats: '',
  sort: 'newest', page: 1, limit: 12,
};

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule, RouterLink, CarCardComponent, PublicNavComponent, PublicFooterComponent],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css',
})
export class InventoryComponent implements OnInit {
  private publicSvc = inject(PublicService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly shortlist = inject(ShortlistService);

  readonly brand = BRAND;
  readonly fmtShort = formatPriceShort;
  readonly humanize = humanize;
  readonly skeletons = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  cars = signal<Car[]>([]);
  makes = signal<Make[]>([]);
  facets = signal<Facets | null>(null);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  totalPages = signal(1);
  filtersOpen = signal(false);

  filters: InventoryFilters = { ...DEFAULTS };

  private searchInput$ = new Subject<string>();

  readonly bodyTypes = ['suv', 'sedan', 'mpv', 'pickup', 'hatchback', 'crossover', 'van'];
  readonly transmissions = ['automatic', 'manual', 'cvt'];
  readonly fuelTypes = ['gasoline', 'diesel', 'hybrid', 'electric'];
  readonly sorts = [
    { value: 'newest', label: 'Newest first' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'year_desc', label: 'Year: newest' },
    { value: 'year_asc', label: 'Year: oldest' },
    { value: 'mileage_asc', label: 'Lowest mileage' },
  ];

  ngOnInit() {
    this.publicSvc.getMakes().subscribe((m) => this.makes.set(m));
    this.publicSvc.getFacets().subscribe((f) => this.facets.set(f));

    // The URL is the source of truth so filters survive refresh and sharing.
    this.route.queryParams.subscribe((params) => {
      this.filters = { ...DEFAULTS };
      Object.keys(DEFAULTS).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
          (this.filters as Record<string, unknown>)[key] =
            key === 'page' || key === 'limit' ? Number(value) : value;
        }
      });
      this.page.set(Number(this.filters.page ?? 1));
      this.load();
    });

    this.searchInput$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe((value) => this.apply({ search: value, page: 1 }));
  }

  private load() {
    this.loading.set(true);
    this.publicSvc.getCars(this.filters).subscribe({
      next: (res) => {
        this.cars.set(res.data);
        this.total.set(res.total);
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.cars.set([]);
        this.loading.set(false);
      },
    });
  }

  onSearchInput(value: string) {
    this.searchInput$.next(value);
  }

  /** Writes the change to the URL; the queryParams subscription reloads. */
  apply(patch: Partial<InventoryFilters>) {
    const next: Record<string, unknown> = { ...this.filters, ...patch };
    if (!('page' in patch)) next['page'] = 1;

    // Keep the URL clean — drop anything left at its default.
    const queryParams: Record<string, unknown> = {};
    Object.entries(next).forEach(([k, v]) => {
      const def = (DEFAULTS as Record<string, unknown>)[k];
      if (v !== '' && v !== null && v !== undefined && v !== def) queryParams[k] = v;
    });

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true,
    });
  }

  toggleBodyType(value: string) {
    this.apply({ bodyType: this.filters.bodyType === value ? '' : value });
  }

  setMake(id: number | '') {
    this.apply({ makeId: this.filters.makeId === id ? '' : id });
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages() || p === this.page()) return;
    this.apply({ page: p });
    window.scrollTo({ top: 260, behavior: 'smooth' });
  }

  reset() {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  get activeFilterCount(): number {
    let n = 0;
    const f = this.filters;
    if (f.search) n++;
    if (f.makeId) n++;
    if (f.bodyType) n++;
    if (f.transmission) n++;
    if (f.fuelType) n++;
    if (f.priceMin || f.priceMax) n++;
    if (f.yearMin || f.yearMax) n++;
    if (f.mileageMax) n++;
    if (f.seats) n++;
    return n;
  }

  /** Page numbers with ellipsis gaps, e.g. [1, -1, 4, 5, 6, -1, 12]. */
  get pageList(): number[] {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    const out: number[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push(-1);
      out.push(p);
      prev = p;
    }
    return out;
  }
}
