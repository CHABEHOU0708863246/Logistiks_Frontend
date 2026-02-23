import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculerRentabilite } from './calculer-rentabilite';

describe('CalculerRentabilite', () => {
  let component: CalculerRentabilite;
  let fixture: ComponentFixture<CalculerRentabilite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculerRentabilite]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalculerRentabilite);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
