import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesDisponibles } from './vehicules-disponibles';

describe('VehiculesDisponibles', () => {
  let component: VehiculesDisponibles;
  let fixture: ComponentFixture<VehiculesDisponibles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesDisponibles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesDisponibles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
