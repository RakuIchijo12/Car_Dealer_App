import { Component, Input, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ThemeService } from '../core/services/theme.service';

/**
 * Three-way theme control.
 *
 * `segmented` shows all three options at once (roomy surfaces like the admin
 * sidebar); `compact` is a single button that cycles, for tight nav bars.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @if (variant === 'segmented') {
      <div class="seg" role="radiogroup" aria-label="Colour theme">
        @for (opt of theme.options; track opt.value) {
          <button
            type="button"
            class="seg-btn"
            role="radio"
            [class.active]="theme.choice() === opt.value"
            [attr.aria-checked]="theme.choice() === opt.value"
            [title]="opt.label + ' theme'"
            (click)="theme.set(opt.value)"
          >
            <span class="seg-ico" aria-hidden="true">
              <ng-container [ngTemplateOutlet]="icon" [ngTemplateOutletContext]="{ $implicit: opt.value }" />
            </span>
            <span class="seg-label">{{ opt.label }}</span>
          </button>
        }
      </div>
    } @else {
      <button
        type="button"
        class="cyc"
        (click)="theme.cycle()"
        [attr.aria-label]="'Theme: ' + current.label + '. Click to change.'"
        [title]="'Theme: ' + current.label"
      >
        <span class="cyc-ico" aria-hidden="true">
          <ng-container [ngTemplateOutlet]="icon" [ngTemplateOutletContext]="{ $implicit: theme.choice() }" />
        </span>
      </button>
    }

    <ng-template #icon let-kind>
      @switch (kind) {
        @case ('light') {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.1 5.1l1.4 1.4M17.5 17.5l1.4 1.4M18.9 5.1l-1.4 1.4M6.5 17.5l-1.4 1.4" />
          </svg>
        }
        @case ('dark') {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
            <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a7 7 0 0 0 10.8 10.8z" />
          </svg>
        }
        @default {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round">
            <rect x="2.5" y="4" width="19" height="13" rx="2" />
            <path d="M8 20.5h8" stroke-linecap="round" />
          </svg>
        }
      }
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; }

    /* ── Segmented ── */
    .seg {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: 99px;
      border: 1px solid var(--hairline);
      background: var(--raise-1);
    }
    .seg-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.34rem 0.7rem;
      border: none;
      border-radius: 99px;
      background: none;
      color: var(--text-3);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.22s, color 0.22s;
    }
    .seg-btn:hover { color: var(--text); }
    .seg-btn.active {
      background: var(--grad);
      color: var(--on-amber);
    }
    .seg-ico { display: grid; place-items: center; width: 14px; height: 14px; }
    .seg-ico svg { width: 100%; height: 100%; }

    /* ── Compact cycle button ── */
    .cyc {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid transparent;
      background: none;
      color: var(--text-2);
      cursor: pointer;
      transition: all 0.22s;
    }
    .cyc svg { width: 17px; height: 17px; }
    .cyc:hover {
      color: var(--amber);
      background: var(--raise-2);
      border-color: var(--hairline);
    }

    @media (max-width: 420px) {
      .seg-label { display: none; }
      .seg-btn { padding: 0.4rem 0.55rem; }
    }
  `],
})
export class ThemeToggleComponent {
  /** 'compact' = one cycling button, 'segmented' = all three shown. */
  @Input() variant: 'compact' | 'segmented' = 'compact';

  readonly theme = inject(ThemeService);

  get current() {
    return this.theme.options.find((o) => o.value === this.theme.choice()) ?? this.theme.options[1];
  }
}
