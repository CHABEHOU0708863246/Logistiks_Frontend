import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeMaintenance } from './vehicule-maintenance';

describe('VehiculeMaintenance', () => {
  let component: VehiculeMaintenance;
  let fixture: ComponentFixture<VehiculeMaintenance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeMaintenance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeMaintenance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
