import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { ShellComponent } from './layout/shell.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CarsComponent } from './pages/cars/cars.component';
import { CarFormComponent } from './pages/car-form/car-form.component';
import { CarDetailComponent } from './pages/car-detail/car-detail.component';
import { MakesComponent } from './pages/makes/makes.component';
import { CustomersComponent } from './pages/customers/customers.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'cars', component: CarsComponent },
      { path: 'cars/new', component: CarFormComponent },
      { path: 'cars/:id', component: CarDetailComponent },
      { path: 'cars/:id/edit', component: CarFormComponent },
      { path: 'makes', component: MakesComponent },
      { path: 'customers', component: CustomersComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
