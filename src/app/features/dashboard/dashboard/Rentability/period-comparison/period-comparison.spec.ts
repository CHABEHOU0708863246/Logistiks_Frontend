import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodComparison } from './period-comparison';

describe('PeriodComparison', () => {
  let component: PeriodComparison;
  let fixture: ComponentFixture<PeriodComparison>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodComparison]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeriodComparison);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
