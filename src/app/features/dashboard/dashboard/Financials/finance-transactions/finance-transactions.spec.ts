import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceTransactions } from './finance-transactions';

describe('FinanceTransactions', () => {
  let component: FinanceTransactions;
  let fixture: ComponentFixture<FinanceTransactions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceTransactions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceTransactions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
