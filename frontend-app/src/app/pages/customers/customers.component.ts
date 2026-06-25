import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CustomersService } from '../../core/services/customers.service';
import { Customer } from '../../core/models';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css',
})
export class CustomersComponent implements OnInit {
  customers = signal<Customer[]>([]);
  showForm = signal(false);
  editing = signal<Customer | null>(null);
  error = signal('');
  form;

  constructor(private svc: CustomersService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      phone: [''],
      notes: [''],
      carId: [''],
    });
  }

  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe((c) => this.customers.set(c)); }
  openNew() { this.form.reset(); this.editing.set(null); this.showForm.set(true); }
  openEdit(c: Customer) { this.editing.set(c); this.form.patchValue({ name: c.name, email: c.email || '', phone: c.phone || '', notes: c.notes || '', carId: c.carId?.toString() || '' }); this.showForm.set(true); }
  cancel() { this.showForm.set(false); this.editing.set(null); }

  submit() {
    if (this.form.invalid) return;
    const data: Partial<Customer> = { ...this.form.value as any };
    if (data.carId) data.carId = +data.carId;
    const req = this.editing() ? this.svc.update(this.editing()!.id, data) : this.svc.create(data);
    req.subscribe({ next: () => { this.load(); this.cancel(); }, error: (e) => this.error.set(e.error?.message || 'Error') });
  }

  delete(id: number) {
    if (!confirm('Delete this customer?')) return;
    this.svc.delete(id).subscribe(() => this.load());
  }
}
