import { Injectable, computed, signal } from '@angular/core';

const FAVOURITES_KEY = 'velora_favourites';
const COMPARE_KEY = 'velora_compare';
export const MAX_COMPARE = 3;

/**
 * Saved cars and the compare tray. Persisted per-browser in localStorage;
 * every access is guarded because private-mode browsers can throw on read.
 */
@Injectable({ providedIn: 'root' })
export class ShortlistService {
  readonly favourites = signal<number[]>(read(FAVOURITES_KEY));
  readonly compare = signal<number[]>(read(COMPARE_KEY));

  readonly favouriteCount = computed(() => this.favourites().length);
  readonly compareCount = computed(() => this.compare().length);
  readonly compareFull = computed(() => this.compare().length >= MAX_COMPARE);

  isFavourite(id: number) {
    return this.favourites().includes(id);
  }

  toggleFavourite(id: number): boolean {
    const next = this.isFavourite(id)
      ? this.favourites().filter((f) => f !== id)
      : [...this.favourites(), id];
    this.favourites.set(next);
    write(FAVOURITES_KEY, next);
    return next.includes(id);
  }

  isComparing(id: number) {
    return this.compare().includes(id);
  }

  /** Returns false when the tray is already full. */
  toggleCompare(id: number): boolean {
    const current = this.compare();
    if (current.includes(id)) {
      const next = current.filter((c) => c !== id);
      this.compare.set(next);
      write(COMPARE_KEY, next);
      return true;
    }
    if (current.length >= MAX_COMPARE) return false;

    const next = [...current, id];
    this.compare.set(next);
    write(COMPARE_KEY, next);
    return true;
  }

  clearCompare() {
    this.compare.set([]);
    write(COMPARE_KEY, []);
  }
}

function read(key: string): number[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

function write(key: string, value: number[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — in-memory state still works for this session */
  }
}
