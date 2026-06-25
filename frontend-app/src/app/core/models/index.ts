export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Make {
  id: number;
  name: string;
  logo?: string;
  createdAt?: string;
}

export type CarStatus = 'available' | 'sold' | 'reserved';

export interface Car {
  id: number;
  make?: Make;
  makeId?: number;
  model: string;
  year: number;
  color?: string;
  mileage: number;
  price: number;
  status: CarStatus;
  vin?: string;
  description?: string;
  photo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  carId?: number;
  createdAt?: string;
}

export interface DashboardStats {
  total: number;
  available: number;
  sold: number;
  reserved: number;
  totalMakes: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}
