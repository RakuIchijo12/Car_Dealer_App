import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { CarsService } from './cars.service';

describe('CarsService', () => {
  let service: CarsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(CarsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
