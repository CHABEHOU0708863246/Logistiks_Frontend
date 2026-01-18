import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeQuickActions } from './vehicule-quick-actions';

describe('VehiculeQuickActions', () => {
  let component: VehiculeQuickActions;
  let fixture: ComponentFixture<VehiculeQuickActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeQuickActions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeQuickActions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
