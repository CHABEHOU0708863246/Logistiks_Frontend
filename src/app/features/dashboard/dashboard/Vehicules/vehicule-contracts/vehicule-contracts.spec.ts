import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeContracts } from './vehicule-contracts';

describe('VehiculeContracts', () => {
  let component: VehiculeContracts;
  let fixture: ComponentFixture<VehiculeContracts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeContracts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeContracts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
