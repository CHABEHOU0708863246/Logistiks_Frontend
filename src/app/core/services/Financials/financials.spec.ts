import { TestBed } from '@angular/core/testing';

import { Financials } from './financials';

describe('Financials', () => {
  let service: Financials;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Financials);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
