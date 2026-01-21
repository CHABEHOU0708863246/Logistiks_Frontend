import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesAssign } from './vehicules-assign';

describe('VehiculesAssign', () => {
  let component: VehiculesAssign;
  let fixture: ComponentFixture<VehiculesAssign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesAssign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesAssign);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
