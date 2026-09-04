import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { BRAND_FULL } from './core/brand';

/**
 * Public storefront routes are lazy-loaded so the landing page ships the
 * smallest possible bundle; the whole admin area is a single lazy chunk.
 */
export const routes: Routes = [
  {
    path: '',
    title: `${BRAND_FULL} — Quality Pre-Owned Cars`,
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'inventory',
    title: `Inventory — ${BRAND_FULL}`,
    loadComponent: () =>
      import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent),
  },
  {
    path: 'vehicle/:id',
    loadComponent: () =>
      import('./pages/vehicle/vehicle.component').then((m) => m.VehicleComponent),
  },
  {
    path: 'compare',
    title: `Compare Vehicles — ${BRAND_FULL}`,
    loadComponent: () =>
      import('./pages/compare/compare.component').then((m) => m.CompareComponent),
  },
  {
    path: 'favourites',
    title: `Saved Vehicles — ${BRAND_FULL}`,
    loadComponent: () =>
      import('./pages/favourites/favourites.component').then((m) => m.FavouritesComponent),
  },
  {
    path: 'sell',
    title: `Sell Your Car — ${BRAND_FULL}`,
    loadComponent: () => import('./pages/sell/sell.component').then((m) => m.SellComponent),
  },
  {
    path: 'about',
    title: `About Us — ${BRAND_FULL}`,
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    title: `Contact — ${BRAND_FULL}`,
    loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent),
  },
  {
    path: 'login',
    title: `Staff Login — ${BRAND_FULL}`,
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },

  // ── Admin ─────────────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: `Dashboard — ${BRAND_FULL}`,
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'cars',
        title: `Inventory — ${BRAND_FULL}`,
        loadComponent: () => import('./pages/cars/cars.component').then((m) => m.CarsComponent),
      },
      {
        path: 'cars/new',
        title: `Add Vehicle — ${BRAND_FULL}`,
        loadComponent: () =>
          import('./pages/car-form/car-form.component').then((m) => m.CarFormComponent),
      },
      {
        path: 'cars/:id/edit',
        title: `Edit Vehicle — ${BRAND_FULL}`,
        loadComponent: () =>
          import('./pages/car-form/car-form.component').then((m) => m.CarFormComponent),
      },
      {
        path: 'cars/:id',
        loadComponent: () =>
          import('./pages/car-detail/car-detail.component').then((m) => m.CarDetailComponent),
      },
      {
        path: 'leads',
        title: `Leads — ${BRAND_FULL}`,
        loadComponent: () => import('./pages/leads/leads.component').then((m) => m.LeadsComponent),
      },
      {
        path: 'makes',
        title: `Brands — ${BRAND_FULL}`,
        loadComponent: () => import('./pages/makes/makes.component').then((m) => m.MakesComponent),
      },
      {
        path: 'customers',
        title: `Customers — ${BRAND_FULL}`,
        loadComponent: () =>
          import('./pages/customers/customers.component').then((m) => m.CustomersComponent),
      },
    ],
  },

  {
    path: '**',
    title: `Page Not Found — ${BRAND_FULL}`,
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
