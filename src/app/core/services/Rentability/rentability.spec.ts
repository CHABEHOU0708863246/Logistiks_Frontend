import { TestBed } from '@angular/core/testing';

import { Rentability } from './rentability';

describe('Rentability', () => {
  let service: Rentability;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rentability);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
