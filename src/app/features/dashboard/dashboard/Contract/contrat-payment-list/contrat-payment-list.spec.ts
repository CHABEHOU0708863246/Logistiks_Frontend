import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratPaymentList } from './contrat-payment-list';

describe('ContratPaymentList', () => {
  let component: ContratPaymentList;
  let fixture: ComponentFixture<ContratPaymentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContratPaymentList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratPaymentList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
