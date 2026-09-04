import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicService } from '../../core/services/public.service';
import { PublicStats } from '../../core/models';
import { BRAND } from '../../core/brand';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, PublicNavComponent, PublicFooterComponent, RevealDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
})
export class AboutComponent {
  private publicSvc = inject(PublicService);

  readonly brand = BRAND;
  readonly yearsTrading = new Date().getFullYear() - BRAND.founded;

  stats = signal<PublicStats | null>(null);

  constructor() {
    this.publicSvc.getStats().subscribe((s) => this.stats.set(s));
  }

  /** The 60-point inspection, grouped the way our techs actually work through it. */
  readonly inspection = [
    {
      area: 'Engine & drivetrain',
      count: 18,
      items: ['Compression test', 'Oil and coolant condition', 'Belt and hose wear', 'Transmission shift quality', 'Clutch / torque converter', 'Leak inspection'],
    },
    {
      area: 'Chassis & suspension',
      count: 14,
      items: ['Shock and strut condition', 'Bushings and linkages', 'Wheel alignment', 'Tyre tread and age', 'Brake pads and discs', 'Underbody rust check'],
    },
    {
      area: 'Electrical & electronics',
      count: 12,
      items: ['Battery load test', 'Alternator output', 'All lighting', 'Infotainment and speakers', 'Power windows and locks', 'Sensor and camera function'],
    },
    {
      area: 'Body & interior',
      count: 10,
      items: ['Panel gap and paint depth', 'Accident and repaint history', 'Glass and seals', 'Aircon cooling performance', 'Upholstery condition', 'Odour and water-ingress check'],
    },
    {
      area: 'Documents & history',
      count: 6,
      items: ['OR/CR verification', 'LTO encumbrance check', 'Chassis and engine number match', 'Service history review', 'Insurance record', 'Number-coding confirmation'],
    },
  ];

  readonly values = [
    {
      title: 'We say no a lot',
      body: 'Roughly one in three units we look at never makes it to the lot. Flood history, chassis repairs, tampered odometers — those get turned away, not detailed and listed.',
    },
    {
      title: 'The price is the price',
      body: 'No reconditioning fee, no documentation fee, no "processing" surprise at signing. What is on the listing is what you pay.',
    },
    {
      title: 'You can bring your own mechanic',
      body: 'Genuinely. Book a slot and have any third-party technician inspect the unit before a single peso changes hands.',
    },
  ];
}
