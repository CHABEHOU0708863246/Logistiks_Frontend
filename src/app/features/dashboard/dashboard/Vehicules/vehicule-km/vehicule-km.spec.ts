import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeKm } from './vehicule-km';

describe('VehiculeKm', () => {
  let component: VehiculeKm;
  let fixture: ComponentFixture<VehiculeKm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeKm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeKm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
