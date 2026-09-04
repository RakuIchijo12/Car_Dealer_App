import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CarsService } from '../../core/services/cars.service';
import { MakesService } from '../../core/services/makes.service';
import { ToastService } from '../../core/services/toast.service';
import { Car, Make } from '../../core/models';
import { humanize, onImgError, photoUrl } from '../../core/utils/format';

interface PendingImage {
  file: File;
  preview: string;
}

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

@Component({
  selector: 'app-car-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './car-form.component.html',
  styleUrl: './car-form.component.css',
})
export class CarFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private carsSvc = inject(CarsService);
  private makesSvc = inject(MakesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly humanize = humanize;
  readonly onImgError = onImgError;
  readonly currentYear = new Date().getFullYear();

  makes = signal<Make[]>([]);
  isEdit = signal(false);
  carId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);

  /** Cover photo: either an existing filename or a freshly picked file. */
  coverFile = signal<File | null>(null);
  coverPreview = signal<string | null>(null);

  /** Gallery: existing filenames plus newly picked files. */
  existingImages = signal<string[]>([]);
  pendingImages = signal<PendingImage[]>([]);

  /** 360 turntable. Frames upload separately from the main form. */
  existingSpin = signal(0);
  spinFiles = signal<File[]>([]);
  spinBusy = signal(false);

  readonly statuses = ['available', 'reserved', 'sold'];
  readonly bodyTypes = ['sedan', 'suv', 'mpv', 'pickup', 'hatchback', 'van', 'crossover'];
  readonly transmissions = ['automatic', 'manual', 'cvt'];
  readonly fuelTypes = ['gasoline', 'diesel', 'hybrid', 'electric'];

  form = this.fb.group({
    makeId: [''],
    model: ['', [Validators.required, Validators.maxLength(120)]],
    year: ['', [Validators.required, Validators.min(1900), Validators.max(this.currentYear + 2)]],
    price: ['', [Validators.required, Validators.min(0)]],
    originalPrice: [''],
    mileage: ['0', [Validators.min(0)]],
    color: [''],
    status: ['available'],
    bodyType: [''],
    transmission: [''],
    fuelType: [''],
    seats: [''],
    engine: [''],
    driveTrain: [''],
    plateEnding: [''],
    vin: [''],
    location: ['Davao City'],
    description: [''],
    features: [''],
    featured: [false],
  });

  ngOnInit() {
    this.makesSvc.getAll().subscribe((m) => this.makes.set(m));

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit.set(true);
    this.carId.set(+id);
    this.loading.set(true);

    this.carsSvc.getOne(+id).subscribe({
      next: (car) => {
        this.patchFrom(car);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load that vehicle');
        void this.router.navigate(['/admin/cars']);
      },
    });
  }

  private patchFrom(car: Car) {
    this.form.patchValue({
      makeId: car.makeId?.toString() ?? '',
      model: car.model,
      year: car.year?.toString() ?? '',
      price: car.price?.toString() ?? '',
      originalPrice: car.originalPrice?.toString() ?? '',
      mileage: car.mileage?.toString() ?? '0',
      color: car.color ?? '',
      status: car.status,
      bodyType: car.bodyType ?? '',
      transmission: car.transmission ?? '',
      fuelType: car.fuelType ?? '',
      seats: car.seats?.toString() ?? '',
      engine: car.engine ?? '',
      driveTrain: car.driveTrain ?? '',
      plateEnding: car.plateEnding?.toString() ?? '',
      vin: car.vin ?? '',
      location: car.location ?? '',
      description: car.description ?? '',
      features: (car.features ?? []).join(', '),
      featured: !!car.featured,
    });

    if (car.photo) this.coverPreview.set(photoUrl(car.photo));
    this.existingImages.set(car.images ?? []);
    this.existingSpin.set(car.spinFrames ?? 0);
  }

  onCoverChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.validate(file)) {
      input.value = '';
      return;
    }

    this.coverFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.coverPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onGalleryChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    for (const file of files) {
      if (!this.validate(file)) continue;
      if (this.pendingImages().length + this.existingImages().length >= 8) {
        this.toast.error('Gallery limit reached', 'Up to 8 extra photos per vehicle.');
        break;
      }
      const reader = new FileReader();
      reader.onload = () =>
        this.pendingImages.update((list) => [...list, { file, preview: reader.result as string }]);
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  private validate(file: File): boolean {
    if (!ACCEPTED.includes(file.type)) {
      this.toast.error('Unsupported file', `${file.name} — use JPG, PNG, WEBP or AVIF.`);
      return false;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.toast.error('File too large', `${file.name} is over the 8 MB limit.`);
      return false;
    }
    return true;
  }

  removePending(index: number) {
    this.pendingImages.update((list) => list.filter((_, i) => i !== index));
  }

  /** Existing gallery images are deleted server-side straight away. */
  removeExisting(filename: string) {
    const id = this.carId();
    if (!id) return;
    if (!confirm('Remove this photo? This cannot be undone.')) return;

    this.carsSvc.removeImage(id, filename).subscribe({
      next: () => {
        this.existingImages.update((list) => list.filter((f) => f !== filename));
        this.toast.success('Photo removed');
      },
      error: () => this.toast.error('Could not remove the photo'),
    });
  }

  // ── 360 turntable ─────────────────────────────────────────────────────────
  onSpinChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []).filter((f) => this.validate(f));
    // Sort by filename so 001,002,…,010 land in shot order regardless of how
    // the OS handed them over.
    picked.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    this.spinFiles.set(picked);
    input.value = '';
  }

  uploadSpin() {
    const id = this.carId();
    const files = this.spinFiles();
    if (!id || files.length < 8) {
      this.toast.error('Not enough frames', 'A turntable needs at least 8 — 24 to 36 is ideal.');
      return;
    }

    this.spinBusy.set(true);
    this.carsSvc.setSpin(id, files).subscribe({
      next: (car) => {
        this.spinBusy.set(false);
        this.spinFiles.set([]);
        this.existingSpin.set(car.spinFrames ?? files.length);
        this.toast.success('360 view uploaded', `${files.length} frames`);
      },
      error: (err) => {
        this.spinBusy.set(false);
        this.toast.error('Could not upload the 360 view', err?.error?.message ?? 'Please try again.');
      },
    });
  }

  removeSpin() {
    const id = this.carId();
    if (!id || !confirm('Remove the 360 view for this vehicle?')) return;

    this.spinBusy.set(true);
    this.carsSvc.clearSpin(id).subscribe({
      next: () => {
        this.spinBusy.set(false);
        this.existingSpin.set(0);
        this.toast.success('360 view removed');
      },
      error: () => {
        this.spinBusy.set(false);
        this.toast.error('Could not remove the 360 view');
      },
    });
  }

  clearCover() {
    this.coverFile.set(null);
    this.coverPreview.set(null);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Check the highlighted fields');
      return;
    }

    this.saving.set(true);
    const fd = new FormData();

    Object.entries(this.form.getRawValue()).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      // `featured` must always be sent so it can be turned off again.
      fd.append(key, String(value));
    });
    if (!this.form.value.featured) fd.set('featured', 'false');

    const cover = this.coverFile();
    if (cover) fd.append('photo', cover);
    this.pendingImages().forEach((p) => fd.append('images', p.file));

    const request = this.isEdit()
      ? this.carsSvc.update(this.carId()!, fd)
      : this.carsSvc.create(fd);

    request.subscribe({
      next: (car) => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Vehicle updated' : 'Vehicle added', `${car.make?.name ?? ''} ${car.model}`.trim());
        // Admin detail route — the old code sent users to a non-existent /cars/:id.
        void this.router.navigate(['/admin/cars', car.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const message = Array.isArray(err?.error?.message)
          ? err.error.message.join(', ')
          : err?.error?.message;
        this.toast.error('Could not save the vehicle', message ?? 'Please try again.');
      },
    });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }

  cancel() {
    void this.router.navigate(['/admin/cars']);
  }

  imageSrc(filename: string): string {
    return photoUrl(filename);
  }
}
