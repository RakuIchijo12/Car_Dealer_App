import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PublicService } from '../../core/services/public.service';
import { ToastService } from '../../core/services/toast.service';
import { BRAND, whatsappLink } from '../../core/brand';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [ReactiveFormsModule, PublicNavComponent, PublicFooterComponent, RevealDirective],
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.css',
})
export class SellComponent {
  private publicSvc = inject(PublicService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly brand = BRAND;
  readonly whatsapp = whatsappLink('Hi! I would like to sell/trade in my vehicle.');
  readonly currentYear = new Date().getFullYear();

  submitting = signal(false);
  submitted = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    email: ['', [Validators.email]],
    vehicleYear: ['', [Validators.required]],
    vehicleMake: ['', [Validators.required]],
    vehicleModel: ['', [Validators.required]],
    mileage: [''],
    condition: ['good'],
    expectedPrice: [''],
    message: [''],
  });

  readonly steps = [
    { n: '01', title: 'Tell us about it', body: 'Fill in the form — year, make, model and mileage is enough to start.' },
    { n: '02', title: 'Free appraisal', body: 'We check current market data and give you an indicative range the same day.' },
    { n: '03', title: 'On-site inspection', body: 'Bring it to the lot (or we come to you within Davao City) for a proper look.' },
    { n: '04', title: 'Get paid', body: 'Accept the offer and we handle the paperwork and transfer. Payment same day.' },
  ];

  readonly reasons = [
    { title: 'Fair market pricing', body: 'We benchmark against live listings, not lowball trade-in books.' },
    { title: 'No obligation', body: 'Get the appraisal, walk away if it is not for you. Zero pressure.' },
    { title: 'Paperwork handled', body: 'Deed of sale, LTO transfer and clearance — all processed by our team.' },
    { title: 'Same-day payment', body: 'Bank transfer or manager cheque released on the day you accept.' },
  ];

  readonly conditions = [
    { value: 'excellent', label: 'Excellent — like new' },
    { value: 'good', label: 'Good — minor wear' },
    { value: 'fair', label: 'Fair — needs some work' },
    { value: 'poor', label: 'Poor — needs repairs' },
  ];

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const v = this.form.getRawValue();

    const vehicle = `${v.vehicleYear} ${v.vehicleMake} ${v.vehicleModel}`.trim();
    const details = [
      v.mileage ? `Mileage: ${v.mileage} km` : null,
      v.condition ? `Condition: ${v.condition}` : null,
      v.expectedPrice ? `Expected price: PHP ${v.expectedPrice}` : null,
      v.message || null,
    ]
      .filter(Boolean)
      .join('\n');

    this.publicSvc
      .submitLead({
        name: v.name!,
        phone: v.phone!,
        email: v.email || undefined,
        type: 'trade_in',
        tradeInVehicle: vehicle,
        budget: v.expectedPrice ? Number(v.expectedPrice) : undefined,
        message: details || `Trade-in enquiry for ${vehicle}`,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.toast.success('Appraisal request sent', res.message);
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(
            'Could not send your request',
            err?.error?.message ?? 'Please try again, or message us on WhatsApp.',
          );
        },
      });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }

  reset() {
    this.submitted.set(false);
    this.form.reset({ condition: 'good' });
  }
}
