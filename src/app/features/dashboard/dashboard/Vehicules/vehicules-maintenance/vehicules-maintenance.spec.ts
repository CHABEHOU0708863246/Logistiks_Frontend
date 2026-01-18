import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesMaintenance } from './vehicules-maintenance';

describe('VehiculesMaintenance', () => {
  let component: VehiculesMaintenance;
  let fixture: ComponentFixture<VehiculesMaintenance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesMaintenance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesMaintenance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
