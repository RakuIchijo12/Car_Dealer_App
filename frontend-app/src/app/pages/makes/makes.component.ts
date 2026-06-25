import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MakesService } from '../../core/services/makes.service';
import { Make } from '../../core/models';

@Component({
  selector: 'app-makes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './makes.component.html',
  styleUrl: './makes.component.css',
})
export class MakesComponent implements OnInit {
  makes = signal<Make[]>([]);
  editing = signal<Make | null>(null);
  showForm = signal(false);
  error = signal('');
  form;

  constructor(private svc: MakesService, private fb: FormBuilder) {
    this.form = this.fb.group({ name: ['', Validators.required] });
  }

  ngOnInit() { this.load(); }
  load() { this.svc.getAll().subscribe((m) => this.makes.set(m)); }

  openNew() { this.form.reset(); this.editing.set(null); this.showForm.set(true); }
  openEdit(m: Make) { this.editing.set(m); this.form.patchValue({ name: m.name }); this.showForm.set(true); }
  cancel() { this.showForm.set(false); this.editing.set(null); }

  submit() {
    if (this.form.invalid) return;
    const data = this.form.value as Partial<Make>;
    const req = this.editing()
      ? this.svc.update(this.editing()!.id, data)
      : this.svc.create(data);
    req.subscribe({ next: () => { this.load(); this.cancel(); }, error: (e) => this.error.set(e.error?.message || 'Error') });
  }

  delete(id: number) {
    if (!confirm('Delete this make? Cars linked to it will lose their make.')) return;
    this.svc.delete(id).subscribe(() => this.load());
  }
}
