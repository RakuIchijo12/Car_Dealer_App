import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../core/brand';
import { ShortlistService } from '../core/services/shortlist.service';

@Component({
  selector: 'app-public-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './public-nav.component.html',
  styleUrl: './public-nav.component.css',
})
export class PublicNavComponent {
  readonly brand = BRAND;
  readonly shortlist = inject(ShortlistService);

  scrolled = signal(false);
  menuOpen = signal(false);

  readonly links = [
    { label: 'Home', route: '/' },
    { label: 'Inventory', route: '/inventory' },
    { label: 'Sell Your Car', route: '/sell' },
    { label: 'About', route: '/about' },
    { label: 'Contact', route: '/contact' },
  ];

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 24);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
}
