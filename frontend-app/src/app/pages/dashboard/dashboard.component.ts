import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CarsService } from '../../core/services/cars.service';
import { LeadsService } from '../../core/services/leads.service';
import { DashboardStats, Car, Lead, LeadStats } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import {
  formatPrice, formatPriceShort, humanize, photoUrl, onImgError, timeAgo, carTitle,
} from '../../core/utils/format';

interface Slice {
  label: string;
  value: number;
  color: string;
  pct: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private carsSvc = inject(CarsService);
  private leadsSvc = inject(LeadsService);
  readonly auth = inject(AuthService);

  readonly fmtPrice = formatPrice;
  readonly fmtShort = formatPriceShort;
  readonly humanize = humanize;
  readonly photoUrl = photoUrl;
  readonly onImgError = onImgError;
  readonly timeAgo = timeAgo;
  readonly carTitle = carTitle;

  stats = signal<DashboardStats | null>(null);
  leadStats = signal<LeadStats | null>(null);
  recent = signal<Car[]>([]);
  recentLeads = signal<Lead[]>([]);
  loading = signal(true);

  readonly greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  /** Donut segments for the status split. */
  readonly statusSlices = computed<Slice[]>(() => {
    const s = this.stats();
    if (!s || !s.total) return [];
    const raw = [
      { label: 'Available', value: s.available, color: 'var(--green)' },
      { label: 'Reserved', value: s.reserved, color: '#FFC24A' },
      { label: 'Sold', value: s.sold, color: 'var(--red)' },
    ];
    return raw
      .filter((r) => r.value > 0)
      .map((r) => ({ ...r, pct: (r.value / s.total) * 100 }));
  });

  /** CSS conic-gradient string driving the donut. */
  readonly donutGradient = computed(() => {
    const slices = this.statusSlices();
    if (!slices.length) return 'var(--surface-2)';

    let cursor = 0;
    const stops = slices.map((s) => {
      const start = cursor;
      cursor += s.pct;
      return `${s.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  /** Bar chart of stock per brand, scaled to the largest. */
  readonly makeBars = computed(() => {
    const byMake = this.stats()?.byMake ?? [];
    const max = Math.max(...byMake.map((m) => m.count), 1);
    return byMake.slice(0, 8).map((m) => ({ ...m, pct: (m.count / max) * 100 }));
  });

  readonly leadPipeline = computed(() => {
    const l = this.leadStats();
    if (!l) return [];
    return [
      { label: 'New', value: l.new, key: 'new' },
      { label: 'Contacted', value: l.contacted, key: 'contacted' },
      { label: 'Negotiating', value: l.negotiating, key: 'negotiating' },
      { label: 'Won', value: l.won, key: 'won' },
      { label: 'Lost', value: l.lost, key: 'lost' },
    ];
  });

  ngOnInit() {
    this.carsSvc.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.carsSvc.getRecent(5).subscribe((r) => this.recent.set(r));
    this.leadsSvc.getStats().subscribe((s) => this.leadStats.set(s));
    this.leadsSvc.getAll().subscribe((l) => this.recentLeads.set(l.slice(0, 5)));
  }
}
