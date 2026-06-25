import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MainComponent } from './main/main.component';
import { authGuard } from './guards/auth.guard';
import { CarsComponent } from './main/cars/cars.component';
import { UsersComponent } from './main/users/users.component';
import { RegisterComponent } from './register/register.component';
import { AddCarComponent } from './main/add-car/add-car.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'register',
    component: RegisterComponent
  },
  {
    path: 'main',
    component: MainComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'cars', pathMatch: 'full' },
      { path: 'cars', component: CarsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'add-car', component: AddCarComponent }
    ]
  }
];
