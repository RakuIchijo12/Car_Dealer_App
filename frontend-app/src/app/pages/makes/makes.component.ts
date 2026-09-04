import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MakesService } from '../../core/services/makes.service';
import { CarsService } from '../../core/services/cars.service';
import { ToastService } from '../../core/services/toast.service';
import { Make } from '../../core/models';

@Component({
  selector: 'app-makes',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './makes.component.html',
  styleUrl: './makes.component.css',
})
export class MakesComponent implements OnInit {
  private svc = inject(MakesService);
  private carsSvc = inject(CarsService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  makes = signal<Make[]>([]);
  counts = signal<Record<string, number>>({});
  loading = signal(true);
  editing = signal<Make | null>(null);
  showForm = signal(false);
  saving = signal(false);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
  });

  ngOnInit() {
    this.load();
    // Stock counts come from the car stats endpoint, keyed by brand name.
    this.carsSvc.getStats().subscribe({
      next: (s) => {
        const map: Record<string, number> = {};
        s.byMake.forEach((m) => (map[m.name] = m.count));
        this.counts.set(map);
      },
      error: () => this.counts.set({}),
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (m) => {
        this.makes.set(m);
        this.loading.set(false);
      },
      error: () => {
        this.makes.set([]);
        this.loading.set(false);
      },
    });
  }

  countFor(make: Make): number {
    return this.counts()[make.name] ?? 0;
  }

  openNew() {
    this.form.reset({ name: '' });
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(make: Make) {
    this.editing.set(make);
    this.form.patchValue({ name: make.name });
    this.showForm.set(true);
  }

  cancel() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const data = { name: this.form.value.name!.trim() };
    const editing = this.editing();
    const request = editing ? this.svc.update(editing.id, data) : this.svc.create(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(editing ? 'Brand updated' : 'Brand added', data.name);
        this.cancel();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message;
        this.toast.error(
          'Could not save the brand',
          Array.isArray(message) ? message.join(', ') : message ?? 'That name may already exist.',
        );
      },
    });
  }

  remove(make: Make) {
    const count = this.countFor(make);
    const warning = count
      ? `${make.name} has ${count} vehicle${count === 1 ? '' : 's'} assigned. They will lose their brand. Continue?`
      : `Delete ${make.name}?`;
    if (!confirm(warning)) return;

    this.svc.delete(make.id).subscribe({
      next: () => {
        this.makes.update((list) => list.filter((m) => m.id !== make.id));
        this.toast.success('Brand deleted', make.name);
      },
      error: () => this.toast.error('Could not delete the brand'),
    });
  }
}
