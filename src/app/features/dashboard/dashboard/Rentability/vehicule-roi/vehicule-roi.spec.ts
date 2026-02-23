import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeRoi } from './vehicule-roi';

describe('VehiculeRoi', () => {
  let component: VehiculeRoi;
  let fixture: ComponentFixture<VehiculeRoi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeRoi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeRoi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
