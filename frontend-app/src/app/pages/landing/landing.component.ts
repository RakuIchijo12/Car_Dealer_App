import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicService, MakeWithCars } from '../../core/services/public.service';
import { Car, Make } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
})
export class LandingComponent implements OnInit {
  allCars      = signal<Car[]>([]);
  makes        = signal<Make[]>([]);
  loading      = signal(true);
  skeletons    = [1, 2, 3, 4, 5, 6, 7, 8];

  search         = '';
  sortByVal      = '';
  selectedMake   = signal<number | null>(null);
  selectedStatus = signal<string>('');
  sortBy         = signal<string>('');

  filteredCars = computed(() => {
    let cars = this.allCars();
    const make   = this.selectedMake();
    const status = this.selectedStatus();
    const q      = this.search.trim().toLowerCase();
    const sort   = this.sortBy();

    if (make)   cars = cars.filter(c => c.make?.id === make);
    if (status) cars = cars.filter(c => c.status === status);
    if (q)      cars = cars.filter(c =>
      c.model.toLowerCase().includes(q) ||
      (c.make?.name ?? '').toLowerCase().includes(q)
    );

    if (sort === 'price_asc')  cars = [...cars].sort((a, b) => +a.price - +b.price);
    if (sort === 'price_desc') cars = [...cars].sort((a, b) => +b.price - +a.price);
    if (sort === 'year_desc')  cars = [...cars].sort((a, b) => b.year - a.year);
    if (sort === 'year_asc')   cars = [...cars].sort((a, b) => a.year - b.year);

    return cars;
  });

  totalCount = computed(() => this.allCars().length);

  constructor(private publicSvc: PublicService) {}

  ngOnInit() {
    this.publicSvc.getCarsByMake().subscribe((groups: MakeWithCars[]) => {
      this.makes.set(groups.map(g => ({ id: g.id, name: g.name, logo: g.logo })));
      const cars = groups.flatMap(g => g.cars.map(c => ({ ...c, make: { id: g.id, name: g.name, logo: g.logo } })));
      this.allCars.set(cars);
      this.loading.set(false);
    });
  }

  setMake(id: number | null) { this.selectedMake.set(id); }
  setStatus(s: string)       { this.selectedStatus.set(s); }
  setSort(s: string)         { this.sortBy.set(s); }

  resetFilters() {
    this.search = '';
    this.sortByVal = '';
    this.selectedMake.set(null);
    this.selectedStatus.set('');
    this.sortBy.set('');
  }

  get hasFilters() {
    return this.search.trim() || this.selectedMake() || this.selectedStatus() || this.sortBy();
  }

  inquire(car: Car) {
    const msg = encodeURIComponent(
      `Hi! I'm interested in the ${car.year} ${car.make?.name} ${car.model} (${this.formatPrice(+car.price)}). Is it still available?`
    );
    window.open(`https://wa.me/639171234567?text=${msg}`, '_blank');
  }

  formatPrice(p: number) {
    return '₱' + new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(p);
  }

  photoUrl(photo: string) {
    if (photo.startsWith('http')) return photo;
    return `${environment.uploadsUrl}/${photo}`;
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = '/car-placeholder.svg';
  }
}
