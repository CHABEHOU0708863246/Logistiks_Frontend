import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesLoues } from './vehicules-loues';

describe('VehiculesLoues', () => {
  let component: VehiculesLoues;
  let fixture: ComponentFixture<VehiculesLoues>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesLoues]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesLoues);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
