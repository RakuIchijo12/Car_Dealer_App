import { Component, inject } from '@angular/core';
import { ToastService } from '../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-host" role="status" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast-{{ t.kind }}">
          <span class="toast-icon">
            @switch (t.kind) {
              @case ('success') {
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              }
              @case ('error') {
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M6 6l8 8M14 6l-8 8" stroke-linecap="round" />
                </svg>
              }
              @default {
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M10 9v5M10 6h.01" stroke-linecap="round" />
                  <circle cx="10" cy="10" r="8" />
                </svg>
              }
            }
          </span>
          <div class="toast-body">
            <p class="toast-title">{{ t.title }}</p>
            @if (t.detail) { <p class="toast-detail">{{ t.detail }}</p> }
          </div>
          <button class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-host {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      pointer-events: none;
      max-width: min(380px, calc(100vw - 2rem));
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      background: rgba(23, 27, 38, 0.94);
      backdrop-filter: blur(20px);
      border: 1px solid var(--hairline-2);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      animation: slide-in-right 0.4s var(--ease-out) both;
    }
    .toast-success { border-left: 3px solid var(--green); }
    .toast-error   { border-left: 3px solid var(--red); }
    .toast-info    { border-left: 3px solid var(--blue); }

    .toast-icon { width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
    .toast-icon svg { width: 100%; height: 100%; }
    .toast-success .toast-icon { color: var(--green); }
    .toast-error   .toast-icon { color: var(--red); }
    .toast-info    .toast-icon { color: var(--blue); }

    .toast-body { flex: 1; min-width: 0; }
    .toast-title { margin: 0; font-size: 0.875rem; font-weight: 600; }
    .toast-detail { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-2); line-height: 1.45; }

    .toast-close {
      background: none; border: none; color: var(--text-3);
      cursor: pointer; font-size: 0.8rem; padding: 0 0 0 0.4rem; line-height: 1;
    }
    .toast-close:hover { color: var(--text); }

    @media (max-width: 640px) {
      .toast-host { left: 1rem; right: 1rem; bottom: 1rem; max-width: none; }
    }
  `],
})
export class ToastHostComponent {
  toast = inject(ToastService);
}
