import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculesList } from './vehicules-list';

describe('VehiculesList', () => {
  let component: VehiculesList;
  let fixture: ComponentFixture<VehiculesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculesList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculesList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
