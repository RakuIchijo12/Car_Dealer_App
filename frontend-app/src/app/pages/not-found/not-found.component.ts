import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, PublicNavComponent, PublicFooterComponent],
  template: `
    <app-public-nav />

    <main class="nf">
      <div class="aurora" aria-hidden="true"></div>
      <div class="grid-lines" aria-hidden="true"></div>

      <div class="wrap nf-inner">
        <span class="nf-code t-grad">404</span>
        <h1 class="t-h1 nf-title">This road leads nowhere</h1>
        <p class="t-lead nf-sub">
          The page you're looking for has moved, sold, or never existed.
          Let's get you back to the cars.
        </p>
        <div class="nf-actions">
          <a routerLink="/inventory" class="btn btn-primary btn-lg">Browse inventory</a>
          <a routerLink="/" class="btn btn-ghost btn-lg">Back to home</a>
        </div>
      </div>
    </main>

    <app-public-footer />
  `,
  styles: [`
    .nf {
      position: relative;
      overflow: hidden;
      min-height: 78vh;
      display: grid;
      place-items: center;
      padding: 8rem 0 5rem;
      text-align: center;
    }
    .nf-inner { position: relative; z-index: 1; }
    .nf-code {
      font-family: 'Sora', sans-serif;
      font-size: clamp(5rem, 18vw, 11rem);
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.05em;
      display: block;
    }
    .nf-title { margin-top: 1rem; }
    .nf-sub { margin: 1.25rem auto 0; max-width: 46ch; }
    .nf-actions {
      display: flex;
      justify-content: center;
      gap: 0.85rem;
      flex-wrap: wrap;
      margin-top: 2.25rem;
    }
  `],
})
export class NotFoundComponent {}
