import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { CarsService } from '../../services/cars.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-car',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './add-car.component.html',
  styleUrl: './add-car.component.css'
})
export class AddCarComponent {
  form: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private carsService: CarsService,
    private router: Router
  ) {
    this.form = this.formBuilder.group({
      make: ['', Validators.required],
      description: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.min(1886)]],
      price: ['', [Validators.required, Validators.min(0)]],
    });
  }

  formatPrice(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value === '') {
      input.value = '';
      return;
    }

    const numericValue = value.replace(/[^0-9]/g, '');
    input.value = this.addCommas(numericValue);
  }

  addCommas(value: string) {
    const numberValue = Number(value);
    return isNaN(numberValue) ? '' : numberValue.toLocaleString('en-US');
  }

  submitDetails() {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.form.valid) {
      const priceValue = this.form.get('price')?.value.replace(/,/g, '');
      this.form.patchValue({ price: priceValue });

      this.carsService.createCars(this.form.getRawValue()).subscribe({
        next: (response) => {
          this.form.reset();
          this.successMessage = 'Car added successfully!';
          this.router.navigateByUrl('/cars');
        },
        error: (error) => {
          if (error.status === 409) {
            this.errorMessage = 'This car is already added.';
          } else {
            this.errorMessage = 'This car is already added.';
          }
        }
      });
    } else {
      this.errorMessage = 'Please fill in all required fields.';
      this.markAllFieldsAsTouched();
    }
  }

  markAllFieldsAsTouched() {
    Object.keys(this.form.controls).forEach(field => {
      const control = this.form.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}
