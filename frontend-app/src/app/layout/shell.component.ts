import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

interface NavItem { label: string; icon: string; route: string; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard' },
    { label: 'Cars',      icon: '🚗', route: '/admin/cars' },
    { label: 'Makes',     icon: '🏭', route: '/admin/makes' },
    { label: 'Customers', icon: '👥', route: '/admin/customers' },
  ];

  constructor(public auth: AuthService) {}
}
