import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PublicService } from '../../core/services/public.service';
import { ShortlistService } from '../../core/services/shortlist.service';
import { ToastService } from '../../core/services/toast.service';
import { Car, LeadType } from '../../core/models';
import { BRAND, BRAND_FULL, whatsappLink } from '../../core/brand';
import { CarCardComponent } from '../../shared/car-card.component';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import {
  carGallery, carTitle, formatMileage, formatNumber, formatPrice, humanize,
  monthlyAmortisation, onImgError,
} from '../../core/utils/format';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [
    FormsModule, ReactiveFormsModule, RouterLink,
    CarCardComponent, PublicNavComponent, PublicFooterComponent,
  ],
  templateUrl: './vehicle.component.html',
  styleUrl: './vehicle.component.css',
})
export class VehicleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicSvc = inject(PublicService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private titleSvc = inject(Title);
  private meta = inject(Meta);
  readonly shortlist = inject(ShortlistService);

  readonly brand = BRAND;
  readonly fmtPrice = formatPrice;
  readonly fmtNumber = formatNumber;
  readonly fmtMileage = formatMileage;
  readonly humanize = humanize;
  readonly onImgError = onImgError;

  car = signal<Car | null>(null);
  similar = signal<Car[]>([]);
  loading = signal(true);
  notFound = signal(false);
  activeImage = signal(0);
  lightbox = signal(false);
  submitting = signal(false);
  submitted = signal(false);

  // ── Financing calculator state ──
  downPct = signal<number>(BRAND.financing.minDownPaymentPct);
  termMonths = signal<number>(BRAND.financing.defaultTermMonths);
  readonly interestRate: number = BRAND.financing.annualInterestRate;
  readonly termOptions: readonly number[] = BRAND.financing.termOptions;

  readonly gallery = computed(() => carGallery(this.car()));

  readonly loan = computed(() => {
    const price = Number(this.car()?.price ?? 0);
    return monthlyAmortisation(price, this.downPct(), this.termMonths(), this.interestRate);
  });

  readonly discountPct = computed(() => {
    const c = this.car();
    const was = Number(c?.originalPrice ?? 0);
    const now = Number(c?.price ?? 0);
    if (!was || was <= now) return null;
    return Math.round(((was - now) / was) * 100);
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    email: ['', [Validators.email]],
    type: ['inquiry' as LeadType, Validators.required],
    preferredDate: [''],
    message: [''],
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id <= 0) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.fetch(id);
    });
  }

  private fetch(id: number) {
    this.loading.set(true);
    this.notFound.set(false);
    this.activeImage.set(0);
    this.submitted.set(false);

    this.publicSvc.getCar(id).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);

        const title = carTitle(car);
        this.titleSvc.setTitle(`${title} — ${BRAND_FULL}`);
        this.meta.updateTag({
          name: 'description',
          content: car.description ?? `${title} available at ${BRAND_FULL}.`,
        });

        this.form.patchValue({
          message: `Hi! I'm interested in the ${title} (${formatPrice(car.price)}). Is it still available?`,
        });
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });

    this.publicSvc.getSimilar(id).subscribe({
      next: (cars) => this.similar.set(cars),
      error: () => this.similar.set([]),
    });
  }

  get title() {
    return carTitle(this.car());
  }

  get whatsapp() {
    const c = this.car();
    if (!c) return whatsappLink('Hi! I have a question about a vehicle.');
    return whatsappLink(
      `Hi! I'm interested in the ${this.title} (${formatPrice(c.price)}). Is it still available?`,
    );
  }

  /** Spec rows, skipping anything the record doesn't have. */
  get specs(): { label: string; value: string }[] {
    const c = this.car();
    if (!c) return [];

    const rows: { label: string; value: string | undefined }[] = [
      { label: 'Body type', value: c.bodyType ? humanize(c.bodyType) : undefined },
      { label: 'Transmission', value: c.transmission ? humanize(c.transmission) : undefined },
      { label: 'Fuel type', value: c.fuelType ? humanize(c.fuelType) : undefined },
      { label: 'Engine', value: c.engine },
      { label: 'Drivetrain', value: c.driveTrain },
      { label: 'Seating', value: c.seats ? `${c.seats} seats` : undefined },
      { label: 'Mileage', value: formatMileage(c.mileage) },
      { label: 'Colour', value: c.color },
      { label: 'Plate ending', value: c.plateEnding !== undefined && c.plateEnding !== null ? String(c.plateEnding) : undefined },
      { label: 'Location', value: c.location },
      { label: 'VIN', value: c.vin },
    ];

    return rows.filter((r): r is { label: string; value: string } => !!r.value);
  }

  selectImage(i: number) {
    this.activeImage.set(i);
  }

  nextImage() {
    this.activeImage.update((i) => (i + 1) % this.gallery().length);
  }

  prevImage() {
    this.activeImage.update((i) => (i - 1 + this.gallery().length) % this.gallery().length);
  }

  toggleFavourite() {
    const c = this.car();
    if (!c) return;
    const added = this.shortlist.toggleFavourite(c.id);
    if (added) this.toast.success('Saved to your list', this.title);
    else this.toast.info('Removed from saved', this.title);
  }

  toggleCompare() {
    const c = this.car();
    if (!c) return;
    if (!this.shortlist.toggleCompare(c.id)) {
      this.toast.error('Compare list is full', 'You can compare up to 3 vehicles.');
    }
  }

  async share() {
    const url = window.location.href;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };

    if (nav.share) {
      try {
        await nav.share({ title: this.title, url });
        return;
      } catch {
        // User dismissed the share sheet — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toast.success('Link copied', 'Share it with anyone.');
    } catch {
      this.toast.error('Could not copy the link');
    }
  }

  submit() {
    const car = this.car();
    if (this.form.invalid || !car) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    this.publicSvc
      .submitLead({
        name: v.name!,
        phone: v.phone!,
        email: v.email || undefined,
        type: v.type ?? 'inquiry',
        preferredDate: v.preferredDate || undefined,
        message: v.message || undefined,
        carId: car.id,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.toast.success('Enquiry sent', res.message);
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(
            'Could not send your enquiry',
            err?.error?.message ?? 'Please try again, or message us on WhatsApp.',
          );
        },
      });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }

  backToInventory() {
    void this.router.navigate(['/inventory']);
  }
}
