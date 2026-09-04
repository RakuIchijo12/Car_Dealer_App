import { Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Car } from '../core/models';
import { ShortlistService } from '../core/services/shortlist.service';
import { ToastService } from '../core/services/toast.service';
import {
  carTitle, formatMileage, formatPrice, humanize, onImgError, photoUrl,
} from '../core/utils/format';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './car-card.component.html',
  styleUrl: './car-card.component.css',
})
export class CarCardComponent {
  @Input({ required: true }) car!: Car;
  /** Stagger index for the reveal animation. */
  @Input() index = 0;

  private shortlist = inject(ShortlistService);
  private toast = inject(ToastService);

  imgLoaded = signal(false);

  readonly fmtPrice = formatPrice;
  readonly fmtMileage = formatMileage;
  readonly humanize = humanize;
  readonly onImgError = onImgError;

  get image() {
    return photoUrl(this.car.photo);
  }

  get title() {
    return carTitle(this.car);
  }

  get isFavourite() {
    return this.shortlist.favourites().includes(this.car.id);
  }

  get isComparing() {
    return this.shortlist.compare().includes(this.car.id);
  }

  /** Percentage saved vs. the original list price, when one is set. */
  get discountPct(): number | null {
    const was = Number(this.car.originalPrice ?? 0);
    const now = Number(this.car.price);
    if (!was || was <= now) return null;
    return Math.round(((was - now) / was) * 100);
  }

  toggleFavourite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const added = this.shortlist.toggleFavourite(this.car.id);
    if (added) this.toast.success('Saved to your list', this.title);
    else this.toast.info('Removed from saved', this.title);
  }

  toggleCompare(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const ok = this.shortlist.toggleCompare(this.car.id);
    if (!ok) {
      this.toast.error('Compare list is full', 'You can compare up to 3 vehicles at a time.');
      return;
    }
    if (this.shortlist.isComparing(this.car.id)) {
      this.toast.success('Added to compare', this.title);
    }
  }
}
