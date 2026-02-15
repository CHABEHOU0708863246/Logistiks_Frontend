import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceCreateTransaction } from './finance-create-transaction';

describe('FinanceCreateTransaction', () => {
  let component: FinanceCreateTransaction;
  let fixture: ComponentFixture<FinanceCreateTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceCreateTransaction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceCreateTransaction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
