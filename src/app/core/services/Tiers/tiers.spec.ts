import { TestBed } from '@angular/core/testing';

import { Tiers } from './tiers';

describe('Tiers', () => {
  let service: Tiers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Tiers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
