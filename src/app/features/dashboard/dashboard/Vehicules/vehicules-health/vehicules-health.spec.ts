import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesHealth } from './vehicules-health';

describe('VehiculesHealth', () => {
  let component: VehiculesHealth;
  let fixture: ComponentFixture<VehiculesHealth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesHealth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesHealth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
