import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import { MakesService } from '../../core/services/makes.service';
import { Make } from '../../core/models';

@Component({
  selector: 'app-car-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './car-form.component.html',
  styleUrl: './car-form.component.css',
})
export class CarFormComponent implements OnInit {
  form;
  makes = signal<Make[]>([]);
  isEdit = signal(false);
  carId = signal<number | null>(null);
  loading = signal(false);
  error = signal('');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private carsSvc: CarsService,
    private makesSvc: MakesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.form = this.fb.group({
      makeId: [''],
      model: ['', Validators.required],
      year: ['', [Validators.required, Validators.min(1900), Validators.max(2030)]],
      color: [''],
      mileage: ['0'],
      price: ['', [Validators.required, Validators.min(0)]],
      status: ['available'],
      vin: [''],
      description: [''],
    });
  }

  ngOnInit() {
    this.makesSvc.getAll().subscribe((m) => this.makes.set(m));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.carId.set(+id);
      this.carsSvc.getOne(+id).subscribe((car) => {
        this.form.patchValue({
          makeId: car.makeId?.toString() || '',
          model: car.model,
          year: car.year.toString(),
          color: car.color || '',
          mileage: car.mileage.toString(),
          price: car.price.toString(),
          status: car.status,
          vin: car.vin || '',
          description: car.description || '',
        });
        if (car.photo) this.previewUrl.set(`http://localhost:3000/uploads/${car.photo}`);
      });
    }
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const fd = new FormData();
    Object.entries(this.form.value).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v as string); });
    if (this.selectedFile()) fd.append('photo', this.selectedFile()!);

    const req = this.isEdit()
      ? this.carsSvc.update(this.carId()!, fd)
      : this.carsSvc.create(fd);

    req.subscribe({
      next: (car) => this.router.navigate(['/cars', car.id]),
      error: (e) => { this.error.set(e.error?.message || 'Error saving car'); this.loading.set(false); },
    });
  }
}
