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
  carCount?: number;
  createdAt?: string;
}

export type CarStatus = 'available' | 'sold' | 'reserved';
export type BodyType = 'sedan' | 'suv' | 'mpv' | 'pickup' | 'hatchback' | 'van' | 'crossover';
export type Transmission = 'automatic' | 'manual' | 'cvt';
export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric';

export interface Car {
  id: number;
  make?: Make;
  makeId?: number;
  model: string;
  year: number;
  color?: string;
  mileage: number;
  price: number;
  originalPrice?: number;
  status: CarStatus;
  bodyType?: BodyType;
  transmission?: Transmission;
  fuelType?: FuelType;
  seats?: number;
  engine?: string;
  driveTrain?: string;
  plateEnding?: number;
  vin?: string;
  location?: string;
  description?: string;
  photo?: string;
  images?: string[];
  features?: string[];
  featured?: boolean;
  views?: number;
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

export type LeadType = 'inquiry' | 'test_drive' | 'trade_in' | 'financing' | 'contact';
export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'won' | 'lost';

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone: string;
  type: LeadType;
  status: LeadStatus;
  message?: string;
  car?: Car;
  carId?: number;
  preferredDate?: string;
  tradeInVehicle?: string;
  budget?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLead {
  name: string;
  email?: string;
  phone: string;
  type?: LeadType;
  message?: string;
  carId?: number;
  preferredDate?: string;
  tradeInVehicle?: string;
  budget?: number;
}

export interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  negotiating: number;
  won: number;
  lost: number;
}

export interface DashboardStats {
  total: number;
  available: number;
  sold: number;
  reserved: number;
  totalMakes: number;
  inventoryValue: number;
  averagePrice: number;
  soldValue: number;
  byMake: { name: string; count: number }[];
  byBodyType: { name: string; count: number }[];
  mostViewed: Car[];
}

export interface PublicStats {
  available: number;
  reserved: number;
  sold: number;
  makes: number;
  total: number;
}

export interface Facets {
  minPrice: number;
  maxPrice: number;
  minYear: number;
  maxYear: number;
  bodyTypes: { value: string; count: number }[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

/** Query shape shared by the storefront inventory page and its URL params. */
export interface InventoryFilters {
  makeId?: number | string;
  search?: string;
  status?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  yearMin?: number | string;
  yearMax?: number | string;
  priceMin?: number | string;
  priceMax?: number | string;
  mileageMax?: number | string;
  seats?: number | string;
  sort?: string;
  page?: number;
  limit?: number;
}
