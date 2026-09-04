import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'velora_theme';

/**
 * Light / dark / system theming.
 *
 * `choice` is what the visitor picked; `resolved` is what is actually on screen
 * (system resolves against the OS preference and follows it live).
 *
 * On "system" the `data-theme` attribute is removed entirely so the stylesheet's
 * `prefers-color-scheme` block takes over — no JS needed to stay in sync.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly systemDark = signal(prefersDark());

  readonly choice = signal<ThemeChoice>(readChoice());

  readonly resolved = computed<ResolvedTheme>(() => {
    const c = this.choice();
    if (c === 'system') return this.systemDark() ? 'dark' : 'light';
    return c;
  });

  readonly options: { value: ThemeChoice; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
  ];

  constructor() {
    // Track the OS preference so "system" updates without a reload.
    const mq = matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', (e) => this.systemDark.set(e.matches));

    effect(() => this.apply(this.choice(), this.resolved()));
  }

  set(choice: ThemeChoice) {
    this.choice.set(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  }

  /** Cycles light → dark → system, for a single-button toggle. */
  cycle() {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(this.choice()) + 1) % order.length];
    this.set(next);
  }

  private apply(choice: ThemeChoice, resolved: ResolvedTheme) {
    const root = document.documentElement;

    // "system" leaves the attribute off so the media query governs.
    if (choice === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', choice);

    // Keeps the browser UI (form controls, scrollbars) in step.
    root.style.colorScheme = resolved;

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', resolved === 'dark' ? '#07080C' : '#F6F7FA');
  }
}

function prefersDark(): boolean {
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

function readChoice(): ThemeChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}
