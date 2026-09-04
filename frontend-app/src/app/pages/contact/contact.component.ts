import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PublicService } from '../../core/services/public.service';
import { ToastService } from '../../core/services/toast.service';
import { LeadType } from '../../core/models';
import { BRAND, whatsappLink } from '../../core/brand';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, PublicNavComponent, PublicFooterComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  private publicSvc = inject(PublicService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly brand = BRAND;
  readonly whatsapp = whatsappLink('Hi! I have a question about your vehicles.');
  readonly mapLink = `https://maps.google.com/?q=${encodeURIComponent(BRAND.contact.mapQuery)}`;

  /** Angular blocks plain strings on iframe[src]; this URL is ours, not user input. */
  readonly mapEmbed: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(
    `https://maps.google.com/maps?q=${encodeURIComponent(BRAND.contact.mapQuery)}&output=embed`,
  );

  submitting = signal(false);
  submitted = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
    email: ['', [Validators.email]],
    type: ['contact' as LeadType, Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  readonly reasons = [
    { value: 'contact', label: 'General question' },
    { value: 'inquiry', label: 'Ask about a vehicle' },
    { value: 'test_drive', label: 'Book a test drive' },
    { value: 'financing', label: 'Financing enquiry' },
    { value: 'trade_in', label: 'Trade in my car' },
  ];

  submit() {
    if (this.form.invalid) {
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
        type: v.type ?? 'contact',
        message: v.message!,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.form.reset({ type: 'contact' });
          this.toast.success('Message sent', res.message);
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(
            'Could not send your message',
            err?.error?.message ?? 'Please try again, or reach us on WhatsApp.',
          );
        },
      });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }
}
