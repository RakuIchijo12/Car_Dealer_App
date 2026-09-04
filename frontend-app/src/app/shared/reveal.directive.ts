import {
  Directive, ElementRef, Input, OnDestroy, OnInit, inject,
} from '@angular/core';

/**
 * Adds `.in` when the element scrolls into view, driving the CSS reveal
 * transition. Degrades to "always visible" where IntersectionObserver is absent.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Stagger in milliseconds, for grids of cards. */
  @Input('appReveal') delay: number | string = 0;

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit() {
    const node = this.el.nativeElement as HTMLElement;

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('in');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const ms = Number(this.delay) || 0;
          if (ms) node.style.transitionDelay = `${ms}ms`;
          node.classList.add('in');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    this.observer.observe(node);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
