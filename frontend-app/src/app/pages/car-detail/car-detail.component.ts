import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import { Car } from '../../core/models';

@Component({
  selector: 'app-car-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './car-detail.component.html',
  styleUrl: './car-detail.component.css',
})
export class CarDetailComponent implements OnInit {
  car = signal<Car | null>(null);

  constructor(private route: ActivatedRoute, private carsSvc: CarsService) {}

  ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.carsSvc.getOne(id).subscribe((c) => this.car.set(c));
  }

  formatPrice(p: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p);
  }

  photoUrl(photo: string) {
    return `http://localhost:3000/uploads/${photo}`;
  }
}
