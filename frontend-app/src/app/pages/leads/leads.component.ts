import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LeadsService } from '../../core/services/leads.service';
import { ToastService } from '../../core/services/toast.service';
import { Lead, LeadStats, LeadStatus } from '../../core/models';
import {
  carTitle, formatDate, formatPrice, humanize, timeAgo,
} from '../../core/utils/format';

const STATUSES: LeadStatus[] = ['new', 'contacted', 'negotiating', 'won', 'lost'];

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.css',
})
export class LeadsComponent implements OnInit {
  private leadsSvc = inject(LeadsService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  readonly humanize = humanize;
  readonly timeAgo = timeAgo;
  readonly formatDate = formatDate;
  readonly fmtPrice = formatPrice;
  readonly carTitle = carTitle;
  readonly statuses = STATUSES;

  leads = signal<Lead[]>([]);
  stats = signal<LeadStats | null>(null);
  loading = signal(true);
  selected = signal<Lead | null>(null);
  savingNotes = signal(false);

  statusFilter = '';
  search = '';
  noteDraft = '';

  private search$ = new Subject<string>();

  ngOnInit() {
    this.route.queryParams.subscribe((p) => {
      this.statusFilter = p['status'] ?? '';
      this.load();
    });

    this.search$.pipe(debounceTime(320), distinctUntilChanged()).subscribe(() => this.load());
    this.loadStats();
  }

  load() {
    this.loading.set(true);
    this.leadsSvc.getAll({ status: this.statusFilter, search: this.search }).subscribe({
      next: (l) => {
        this.leads.set(l);
        this.loading.set(false);
      },
      error: () => {
        this.leads.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadStats() {
    this.leadsSvc.getStats().subscribe((s) => this.stats.set(s));
  }

  onSearch(value: string) {
    this.search = value;
    this.search$.next(value);
  }

  setFilter(status: string) {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.load();
  }

  open(lead: Lead) {
    this.selected.set(lead);
    this.noteDraft = lead.notes ?? '';
  }

  close() {
    this.selected.set(null);
  }

  /** Optimistically move the lead, rolling back if the request fails. */
  setStatus(lead: Lead, status: LeadStatus) {
    if (lead.status === status) return;
    const previous = lead.status;

    this.patch(lead.id, { ...lead, status });
    this.leadsSvc.update(lead.id, { status }).subscribe({
      next: () => {
        this.toast.success('Lead moved to ' + humanize(status), lead.name);
        this.loadStats();
      },
      error: () => {
        this.patch(lead.id, { ...lead, status: previous });
        this.toast.error('Could not update the lead', 'Please try again.');
      },
    });
  }

  saveNotes() {
    const lead = this.selected();
    if (!lead) return;

    this.savingNotes.set(true);
    this.leadsSvc.update(lead.id, { notes: this.noteDraft }).subscribe({
      next: (updated) => {
        this.patch(lead.id, updated);
        this.selected.set(updated);
        this.savingNotes.set(false);
        this.toast.success('Notes saved');
      },
      error: () => {
        this.savingNotes.set(false);
        this.toast.error('Could not save notes');
      },
    });
  }

  remove(lead: Lead) {
    if (!confirm(`Delete the enquiry from ${lead.name}? This cannot be undone.`)) return;

    this.leadsSvc.delete(lead.id).subscribe({
      next: () => {
        this.leads.update((list) => list.filter((l) => l.id !== lead.id));
        if (this.selected()?.id === lead.id) this.close();
        this.toast.success('Enquiry deleted');
        this.loadStats();
      },
      error: () => this.toast.error('Could not delete the enquiry'),
    });
  }

  private patch(id: number, next: Lead) {
    this.leads.update((list) => list.map((l) => (l.id === id ? { ...l, ...next } : l)));
    if (this.selected()?.id === id) this.selected.set({ ...this.selected()!, ...next });
  }

  countFor(status: LeadStatus): number {
    return this.stats()?.[status] ?? 0;
  }

  /** tel: link needs the raw digits. */
  telLink(phone: string): string {
    return 'tel:' + phone.replace(/[^\d+]/g, '');
  }

  waLink(lead: Lead): string {
    const digits = lead.phone.replace(/\D/g, '').replace(/^0/, '63');
    const subject = lead.car ? carTitle(lead.car) : 'your enquiry';
    const text = encodeURIComponent(`Hi ${lead.name}! Following up on ${subject}.`);
    return `https://wa.me/${digits}?text=${text}`;
  }
}
