import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeForm } from './vehicule-form';

describe('VehiculeForm', () => {
  let component: VehiculeForm;
  let fixture: ComponentFixture<VehiculeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
