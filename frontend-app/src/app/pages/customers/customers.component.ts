import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { CustomersService } from '../../core/services/customers.service';
import { CarsService } from '../../core/services/cars.service';
import { ToastService } from '../../core/services/toast.service';
import { Car, Customer } from '../../core/models';
import { carTitle, formatDate, timeAgo } from '../../core/utils/format';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css',
})
export class CustomersComponent implements OnInit {
  private svc = inject(CustomersService);
  private carsSvc = inject(CarsService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  readonly formatDate = formatDate;
  readonly timeAgo = timeAgo;

  customers = signal<Customer[]>([]);
  cars = signal<Car[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editing = signal<Customer | null>(null);
  saving = signal(false);

  search = '';

  readonly filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter((c) =>
      [c.name, c.email, c.phone, c.notes].some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  });

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.email]],
    phone: [''],
    carId: [''],
    notes: [''],
  });

  ngOnInit() {
    this.load();
    this.carsSvc.getAll().subscribe({
      next: (c) => this.cars.set(c),
      error: () => this.cars.set([]),
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (c) => {
        this.customers.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.customers.set([]);
        this.loading.set(false);
      },
    });
  }

  carLabel(carId: number | undefined): string | null {
    if (!carId) return null;
    const car = this.cars().find((c) => c.id === carId);
    return car ? carTitle(car) : null;
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  openNew() {
    this.form.reset({ name: '', email: '', phone: '', carId: '', notes: '' });
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(customer: Customer) {
    this.editing.set(customer);
    this.form.patchValue({
      name: customer.name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      carId: customer.carId?.toString() ?? '',
      notes: customer.notes ?? '',
    });
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
    const v = this.form.getRawValue();
    const data: Partial<Customer> = {
      name: v.name!,
      email: v.email || undefined,
      phone: v.phone || undefined,
      notes: v.notes || undefined,
      carId: v.carId ? +v.carId : undefined,
    };

    const editing = this.editing();
    const request = editing ? this.svc.update(editing.id, data) : this.svc.create(data);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(editing ? 'Customer updated' : 'Customer added', data.name);
        this.cancel();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message;
        this.toast.error(
          'Could not save the customer',
          Array.isArray(message) ? message.join(', ') : message ?? 'Please try again.',
        );
      },
    });
  }

  remove(customer: Customer) {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;

    this.svc.delete(customer.id).subscribe({
      next: () => {
        this.customers.update((list) => list.filter((c) => c.id !== customer.id));
        this.toast.success('Customer deleted', customer.name);
      },
      error: () => this.toast.error('Could not delete the customer'),
    });
  }

  invalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }

  telLink(phone: string): string {
    return 'tel:' + phone.replace(/[^\d+]/g, '');
  }
}
