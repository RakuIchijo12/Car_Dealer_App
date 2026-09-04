import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { LeadsService } from '../core/services/leads.service';
import { BRAND } from '../core/brand';
import { ThemeToggleComponent } from '../shared/theme-toggle.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Live count rendered as a pill, e.g. new leads. */
  badge?: () => number | null;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  private leadsSvc = inject(LeadsService);

  readonly brand = BRAND;

  collapsed = signal(readCollapsed());
  mobileOpen = signal(false);
  newLeads = signal<number>(0);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: 'grid' },
    { label: 'Inventory', route: '/admin/cars', icon: 'car' },
    { label: 'Leads', route: '/admin/leads', icon: 'inbox', badge: () => this.newLeads() || null },
    { label: 'Brands', route: '/admin/makes', icon: 'tag' },
    { label: 'Customers', route: '/admin/customers', icon: 'users' },
  ];

  ngOnInit() {
    this.leadsSvc.getStats().subscribe({
      next: (s) => this.newLeads.set(s.new ?? 0),
      error: () => this.newLeads.set(0),
    });
  }

  toggleCollapse() {
    this.collapsed.update((v) => {
      const next = !v;
      try {
        localStorage.setItem('velora_sidebar_collapsed', String(next));
      } catch {
        /* storage blocked */
      }
      return next;
    });
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }

  logout() {
    this.auth.logout('/');
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem('velora_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
}
