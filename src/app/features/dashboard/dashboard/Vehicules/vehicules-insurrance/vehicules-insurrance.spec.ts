import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesInsurrance } from './vehicules-insurrance';

describe('VehiculesInsurrance', () => {
  let component: VehiculesInsurrance;
  let fixture: ComponentFixture<VehiculesInsurrance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesInsurrance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesInsurrance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
