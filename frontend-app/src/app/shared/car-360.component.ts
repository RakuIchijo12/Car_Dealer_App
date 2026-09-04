import {
  Component, ElementRef, Input, OnDestroy, OnInit, computed, signal, viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

/**
 * 360° turntable viewer.
 *
 * Drag horizontally to rotate, wheel or pinch to zoom, drag to pan once zoomed
 * in. Plays back a pre-rendered frame sequence — no WebGL, no model download —
 * so it works on low-end phones and degrades to a still image if frames fail.
 *
 * Frames must be a full revolution in order; index 0 is the front-three-quarter.
 */
@Component({
  selector: 'app-car-360',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './car-360.component.html',
  styleUrl: './car-360.component.css',
})
export class Car360Component implements OnInit, OnDestroy {
  /** Ordered frame URLs, one full revolution. */
  @Input({ required: true }) frames: string[] = [];
  @Input() alt = '';
  /** Spin once on load to advertise the interaction. */
  @Input() autoSpin = true;
  /** Shown when the frames are an illustrative render, not the actual unit. */
  @Input() previewNotice = '';

  private stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  readonly index = signal(0);
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly loaded = signal(0);
  readonly dragging = signal(false);
  readonly hinted = signal(false);
  readonly fullscreen = signal(false);

  readonly ready = computed(() => this.frames.length > 0 && this.loaded() >= this.frames.length);
  readonly progress = computed(() =>
    this.frames.length ? Math.round((this.loaded() / this.frames.length) * 100) : 0,
  );
  readonly zoomed = computed(() => this.zoom() > 1.02);

  readonly transform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`,
  );

  private pointers = new Map<number, { x: number; y: number }>();
  private lastX = 0;
  private lastY = 0;
  private pinchStart = 0;
  private zoomStart = 1;
  private accum = 0;
  private autoTimer?: number;
  private hintTimer?: number;
  private userControlled = false;

  ngOnInit() {
    // Preload every frame; the viewer only becomes interactive once complete so
    // dragging never stutters on a missing image.
    this.frames.forEach((src) => {
      const img = new Image();
      const done = () => this.loaded.update((n) => n + 1);
      img.onload = done;
      img.onerror = done; // a gap must not wedge the loader
      img.src = src;
    });

    if (this.autoSpin) {
      this.hintTimer = window.setTimeout(() => this.startAutoSpin(), 700);
    }
  }

  ngOnDestroy() {
    this.stopAutoSpin();
    if (this.hintTimer) clearTimeout(this.hintTimer);
    if (this.fullscreen()) document.body.style.removeProperty('overflow');
  }

  // ── Auto spin ─────────────────────────────────────────────────────────────
  private startAutoSpin() {
    // Once the visitor has taken control, never wrest it back.
    if (this.userControlled) return;

    if (!this.ready()) {
      // Preload still running — retry, but only while unattended.
      this.hintTimer = window.setTimeout(() => this.startAutoSpin(), 400);
      return;
    }
    if (this.autoTimer) return;

    this.hinted.set(true);
    let steps = 0;
    this.autoTimer = window.setInterval(() => {
      this.step(1);
      if (++steps >= this.frames.length) this.stopAutoSpin();
    }, 55);
  }

  /**
   * Cancels the intro spin *and* any pending retry. Missing the retry meant a
   * queued timer could fire after the visitor dragged and spin the car away
   * from the angle they chose.
   */
  private stopAutoSpin() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = undefined;
    }
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = undefined;
    }
  }

  /** Any deliberate input hands control to the visitor for good. */
  private takeControl() {
    this.userControlled = true;
    this.stopAutoSpin();
  }

  private step(delta: number) {
    const n = this.frames.length;
    if (!n) return;
    this.index.set((((this.index() + delta) % n) + n) % n);
  }

  // ── Pointer handling ──────────────────────────────────────────────────────
  onPointerDown(e: PointerEvent) {
    this.takeControl();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragging.set(true);

    if (this.pointers.size === 2) {
      this.pinchStart = this.pinchDistance();
      this.zoomStart = this.zoom();
    }
  }

  onPointerMove(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two fingers: pinch to zoom.
    if (this.pointers.size === 2) {
      const d = this.pinchDistance();
      if (this.pinchStart > 0) this.setZoom((this.zoomStart * d) / this.pinchStart);
      return;
    }

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.zoomed()) {
      // Zoomed in: drag inspects the surface rather than rotating.
      this.panBy(dx, dy);
      return;
    }

    // One frame per N pixels — scaled so a full drag across the stage is roughly
    // one revolution regardless of screen size.
    const width = this.stage().nativeElement.clientWidth || 600;
    const pxPerFrame = Math.max(width / this.frames.length, 4);
    this.accum += dx;
    while (Math.abs(this.accum) >= pxPerFrame) {
      this.step(this.accum > 0 ? -1 : 1);
      this.accum += this.accum > 0 ? -pxPerFrame : pxPerFrame;
    }
  }

  onPointerUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStart = 0;
    if (this.pointers.size === 0) {
      this.dragging.set(false);
      this.accum = 0;
    }
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // ── Zoom & pan ────────────────────────────────────────────────────────────
  onWheel(e: WheelEvent) {
    e.preventDefault();
    this.takeControl();
    this.setZoom(this.zoom() * (e.deltaY < 0 ? 1.12 : 0.89));
  }

  zoomIn() { this.setZoom(this.zoom() * 1.25); }
  zoomOut() { this.setZoom(this.zoom() / 1.25); }

  private setZoom(next: number) {
    const clamped = Math.min(Math.max(next, 1), 4);
    this.zoom.set(clamped);
    if (clamped <= 1.02) {
      this.panX.set(0);
      this.panY.set(0);
    } else {
      this.clampPan();
    }
  }

  private panBy(dx: number, dy: number) {
    this.panX.update((v) => v + dx);
    this.panY.update((v) => v + dy);
    this.clampPan();
  }

  /** Keeps the image from being dragged off the stage. */
  private clampPan() {
    const el = this.stage().nativeElement;
    const limitX = (el.clientWidth * (this.zoom() - 1)) / 2;
    const limitY = (el.clientHeight * (this.zoom() - 1)) / 2;
    this.panX.update((v) => Math.min(Math.max(v, -limitX), limitX));
    this.panY.update((v) => Math.min(Math.max(v, -limitY), limitY));
  }

  reset() {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  onKeydown(e: KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => this.step(-1),
      ArrowRight: () => this.step(1),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      '0': () => this.reset(),
      Escape: () => this.fullscreen() && this.toggleFullscreen(),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    this.takeControl();
    action();
  }

  toggleFullscreen() {
    const next = !this.fullscreen();
    this.fullscreen.set(next);
    // Prevent the page scrolling behind the overlay.
    if (next) document.body.style.setProperty('overflow', 'hidden');
    else document.body.style.removeProperty('overflow');
    this.reset();
  }

  replay() {
    this.reset();
    this.index.set(0);
    this.userControlled = false;
    this.startAutoSpin();
  }
}
