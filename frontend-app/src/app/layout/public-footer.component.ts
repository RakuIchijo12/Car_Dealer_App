import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BRAND, BRAND_FULL } from '../core/brand';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.component.html',
  styleUrl: './public-footer.component.css',
})
export class PublicFooterComponent {
  readonly brand = BRAND;
  readonly brandFull = BRAND_FULL;
  readonly year = new Date().getFullYear();
  readonly mapUrl = `https://maps.google.com/?q=${encodeURIComponent(BRAND.contact.mapQuery)}`;

  readonly quickLinks = [
    { label: 'Browse Inventory', route: '/inventory' },
    { label: 'Sell Your Car', route: '/sell' },
    { label: 'Compare Vehicles', route: '/compare' },
    { label: 'Saved Vehicles', route: '/favourites' },
    { label: 'About Us', route: '/about' },
    { label: 'Contact', route: '/contact' },
  ];

  readonly bodyTypes = ['SUV', 'Sedan', 'MPV', 'Pickup', 'Hatchback', 'Crossover'];
}
