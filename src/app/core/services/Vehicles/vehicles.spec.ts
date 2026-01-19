import { TestBed } from '@angular/core/testing';

import { Vehicles } from './vehicles';

describe('Vehicles', () => {
  let service: Vehicles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Vehicles);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
