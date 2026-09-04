/**
 * Single source of truth for everything customer-facing.
 * Renaming the dealership is a one-file change — nothing else hardcodes the name.
 */
export const BRAND = {
  /** Shown as "Velo" + "ra" so the logo can colour the second half. */
  name: 'Velora',
  nameSuffix: 'Motors',
  legalName: 'Velora Motors Philippines',
  tagline: 'Drive Something Better.',
  description:
    'Hand-picked, fully inspected pre-owned vehicles in Davao City. Complete papers, honest pricing, financing ready.',

  founded: 2019,

  contact: {
    phone: '0917 123 4567',
    phoneRaw: '+639171234567',
    whatsapp: '639171234567',
    email: 'hello@veloramotors.ph',
    address: 'J.P. Laurel Avenue, Bajada',
    city: 'Davao City',
    region: 'Davao del Sur, Philippines',
    hours: 'Mon – Sat · 8:00 AM – 6:00 PM',
    mapQuery: 'J.P. Laurel Avenue, Bajada, Davao City',
  },

  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com',
    youtube: 'https://youtube.com',
  },

  /** Defaults for the loan calculator (typical Philippine bank auto-loan terms). */
  financing: {
    minDownPaymentPct: 20,
    defaultTermMonths: 60,
    annualInterestRate: 9.5,
    termOptions: [12, 24, 36, 48, 60, 72],
  },
} as const;

/** "Velora Motors" — for titles, emails and legal copy. */
export const BRAND_FULL = `${BRAND.name} ${BRAND.nameSuffix}`;

/** Prefilled WhatsApp deep link. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${BRAND.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}
