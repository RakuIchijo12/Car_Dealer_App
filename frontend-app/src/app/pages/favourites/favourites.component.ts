import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PublicService } from '../../core/services/public.service';
import { ShortlistService } from '../../core/services/shortlist.service';
import { Car } from '../../core/models';
import { CarCardComponent } from '../../shared/car-card.component';
import { PublicNavComponent } from '../../layout/public-nav.component';
import { PublicFooterComponent } from '../../layout/public-footer.component';

@Component({
  selector: 'app-favourites',
  standalone: true,
  imports: [RouterLink, CarCardComponent, PublicNavComponent, PublicFooterComponent],
  templateUrl: './favourites.component.html',
  styleUrl: './favourites.component.css',
})
export class FavouritesComponent implements OnInit {
  private publicSvc = inject(PublicService);
  readonly shortlist = inject(ShortlistService);

  cars = signal<Car[]>([]);
  loading = signal(true);

  constructor() {
    // Re-fetch whenever the saved list changes (e.g. unsaving from a card here).
    effect(() => {
      const ids = this.shortlist.favourites();
      this.fetch(ids);
    });
  }

  ngOnInit() {
    // The effect above performs the initial load.
  }

  private fetch(ids: number[]) {
    if (!ids.length) {
      this.cars.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    // A listing may have been sold and removed — drop those silently.
    forkJoin(ids.map((id) => this.publicSvc.getCar(id).pipe(catchError(() => of(null))))).subscribe(
      (results) => {
        this.cars.set(results.filter((c): c is Car => c !== null));
        this.loading.set(false);
      },
    );
  }

  clearAll() {
    this.shortlist.favourites().forEach((id) => this.shortlist.toggleFavourite(id));
  }
}
