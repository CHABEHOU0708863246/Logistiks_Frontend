import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceTransactionsValidate } from './finance-transactions-validate';

describe('FinanceTransactionsValidate', () => {
  let component: FinanceTransactionsValidate;
  let fixture: ComponentFixture<FinanceTransactionsValidate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceTransactionsValidate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceTransactionsValidate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
