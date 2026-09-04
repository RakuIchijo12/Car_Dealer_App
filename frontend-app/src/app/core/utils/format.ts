import { environment } from '../../../environments/environment';
import { Car } from '../models';

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat('en-PH');

/** ₱1,450,000 */
export function formatPrice(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  return PESO.format(Number.isFinite(n) ? n : 0);
}

/** ₱1.45M / ₱898K — for tight spaces like chart axes and stat tiles. */
export function formatPriceShort(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '₱0';
  if (n >= 1_000_000) return '₱' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2) + 'M';
  if (n >= 1_000) return '₱' + Math.round(n / 1_000) + 'K';
  return '₱' + Math.round(n);
}

export function formatNumber(value: number | string | undefined | null): string {
  const n = Number(value ?? 0);
  return NUM.format(Number.isFinite(n) ? n : 0);
}

/** "22,000 km" */
export function formatMileage(km: number | undefined | null): string {
  return formatNumber(km) + ' km';
}

/** "3 days ago", "just now" — relative time for lead lists. */
export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';

  // Each step divides the running value down into the next unit up.
  const steps: [size: number, label: string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
  ];

  let value = seconds;
  for (const [size, label] of steps) {
    if (value < size) return plural(Math.floor(value), label);
    value /= size;
  }
  return plural(Math.floor(value), 'year');
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Resolve a stored photo filename to a URL.
 * Handles absolute URLs, data URIs and bare filenames, and falls back to the
 * bundled placeholder — this is the one place uploads URLs are built.
 */
export function photoUrl(photo: string | undefined | null): string {
  if (!photo) return '/car-placeholder.svg';
  if (photo.startsWith('http') || photo.startsWith('data:') || photo.startsWith('blob:')) return photo;
  return `${environment.uploadsUrl}/${photo}`;
}

/** Cover photo plus gallery, de-duplicated, always at least one entry. */
export function carGallery(car: Car | null | undefined): string[] {
  if (!car) return ['/car-placeholder.svg'];
  const all = [car.photo, ...(car.images ?? [])].filter(Boolean) as string[];
  const unique = [...new Set(all)];
  return unique.length ? unique.map(photoUrl) : ['/car-placeholder.svg'];
}

export function onImgError(event: Event): void {
  const img = event.target as HTMLImageElement;
  if (!img.src.endsWith('/car-placeholder.svg')) img.src = '/car-placeholder.svg';
}

/** "2023 Toyota Fortuner" */
export function carTitle(car: Car | null | undefined): string {
  if (!car) return '';
  return `${car.year} ${car.make?.name ?? ''} ${car.model}`.replace(/\s+/g, ' ').trim();
}

/** URL-safe slug for share links: "2023-toyota-fortuner". */
export function carSlug(car: Car): string {
  return carTitle(car).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const LABELS: Record<string, string> = {
  suv: 'SUV', mpv: 'MPV', cvt: 'CVT', vin: 'VIN',
  test_drive: 'Test Drive', trade_in: 'Trade-In',
};

/** "test_drive" -> "Test Drive", "suv" -> "SUV", "automatic" -> "Automatic" */
export function humanize(value: string | undefined | null): string {
  if (!value) return '—';
  if (LABELS[value]) return LABELS[value];
  return value
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Standard Philippine bank auto-loan amortisation.
 * Returns the monthly payment for the amount financed.
 */
export function monthlyAmortisation(
  price: number,
  downPaymentPct: number,
  termMonths: number,
  annualRatePct: number,
): { monthly: number; downPayment: number; principal: number; totalInterest: number; totalPayable: number } {
  const downPayment = Math.round((price * downPaymentPct) / 100);
  const principal = Math.max(price - downPayment, 0);
  const monthlyRate = annualRatePct / 100 / 12;

  const monthly =
    monthlyRate === 0
      ? principal / termMonths
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));

  const totalPayable = monthly * termMonths;

  return {
    monthly: Math.round(monthly),
    downPayment,
    principal,
    totalInterest: Math.round(totalPayable - principal),
    totalPayable: Math.round(totalPayable),
  };
}
