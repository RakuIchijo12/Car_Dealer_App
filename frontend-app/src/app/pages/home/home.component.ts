import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PublicService } from '../../core/services/public.service';
import { Car, Facets, Make, PublicStats } from '../../core/models';
import { BRAND, BRAND_FULL } from '../../core/brand';
import { CarCardComponent } from '../../shared/car-card.component';
import { RevealDirective } from '../../shared/reveal.directive';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import { formatNumber } from '../../core/utils/format';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule, RouterLink, CarCardComponent, RevealDirective,
    PublicNavComponent, PublicFooterComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private publicSvc = inject(PublicService);
  private router = inject(Router);
  private title = inject(Title);
  private meta = inject(Meta);

  readonly brand = BRAND;
  readonly fmtNumber = formatNumber;

  featured = signal<Car[]>([]);
  makes = signal<Make[]>([]);
  stats = signal<PublicStats | null>(null);
  facets = signal<Facets | null>(null);
  loading = signal(true);

  quickSearch = '';
  quickBodyType = '';
  quickMake = '';

  readonly skeletons = [0, 1, 2, 3, 4, 5];

  readonly bodyTypes = [
    { value: 'suv', label: 'SUV' },
    { value: 'sedan', label: 'Sedan' },
    { value: 'mpv', label: 'MPV' },
    { value: 'pickup', label: 'Pickup' },
    { value: 'hatchback', label: 'Hatchback' },
    { value: 'crossover', label: 'Crossover' },
  ];

  readonly promises = [
    {
      title: 'Multi-Point Inspected',
      body: 'Every unit passes a 60-point mechanical and cosmetic inspection before it reaches the lot.',
      icon: 'shield',
    },
    {
      title: 'Complete Papers',
      body: 'Clean OR/CR, verified LTO registration and a full service history — handed over on day one.',
      icon: 'doc',
    },
    {
      title: 'Honest, Fixed Pricing',
      body: 'The price on the listing is the price you pay. No hidden reconditioning or documentation fees.',
      icon: 'tag',
    },
    {
      title: 'Financing in 24 Hours',
      body: 'Bank and in-house options with as low as 20% down. Most approvals land within a day.',
      icon: 'bank',
    },
  ];

  readonly steps = [
    { n: '01', title: 'Browse & Shortlist', body: 'Filter by budget, body type and brand. Save the units you like.' },
    { n: '02', title: 'Book a Viewing', body: 'Reserve a test drive online — we prep the unit before you arrive.' },
    { n: '03', title: 'Get Approved', body: 'Submit your requirements once. We shop your file to partner banks.' },
    { n: '04', title: 'Drive Home', body: 'Complete papers, plates and turnover handled by our team.' },
  ];

  readonly testimonials = [
    {
      quote: 'Sobrang smooth ng transaction. The Fortuner was exactly as described — no surprises, complete papers, and they even delivered it to our house in Tagum.',
      name: 'Rowena B.',
      detail: 'Toyota Fortuner · Tagum City',
    },
    {
      quote: 'I was nervous buying second-hand, but they let my mechanic inspect the unit before I paid anything. That built the trust for me.',
      name: 'Mark Anthony D.',
      detail: 'Honda Civic RS · Davao City',
    },
    {
      quote: 'Financing approval took one day lang. Very transparent sa computation, walang hidden charges. Highly recommended talaga.',
      name: 'Jenny R.',
      detail: 'Mitsubishi Xpander · Panabo',
    },
  ];

  ngOnInit() {
    this.title.setTitle(`${BRAND_FULL} — Quality Pre-Owned Cars in ${BRAND.contact.city}`);
    this.meta.updateTag({ name: 'description', content: BRAND.description });

    this.publicSvc.getFeatured(6).subscribe({
      next: (cars) => {
        this.featured.set(cars);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.publicSvc.getMakes().subscribe((m) => this.makes.set(m.filter((x) => (x.carCount ?? 0) > 0)));
    this.publicSvc.getStats().subscribe((s) => this.stats.set(s));

    // Powers the live count on each body-type card, so the row reflects real
    // stock rather than being a static list of shapes.
    this.publicSvc.getFacets().subscribe((f) => this.facets.set(f));
  }

  /** How many listed vehicles share this body type. */
  countFor(bodyType: string): number {
    return this.facets()?.bodyTypes.find((b) => b.value === bodyType)?.count ?? 0;
  }

  /** Hero search hands off to the inventory page with query params. */
  search() {
    const params: Record<string, string> = {};
    if (this.quickSearch.trim()) params['search'] = this.quickSearch.trim();
    if (this.quickBodyType) params['bodyType'] = this.quickBodyType;
    if (this.quickMake) params['makeId'] = this.quickMake;
    void this.router.navigate(['/inventory'], { queryParams: params });
  }
}
