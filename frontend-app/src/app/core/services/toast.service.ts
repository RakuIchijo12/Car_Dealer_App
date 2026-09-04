import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(title: string, detail?: string) { this.push('success', title, detail); }
  error(title: string, detail?: string)   { this.push('error', title, detail); }
  info(title: string, detail?: string)    { this.push('info', title, detail); }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: ToastKind, title: string, detail?: string) {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, title, detail }]);
    // Errors linger a little longer — they usually need reading.
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 4000);
  }
}
