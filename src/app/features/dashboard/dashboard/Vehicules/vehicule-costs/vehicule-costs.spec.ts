import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeCosts } from './vehicule-costs';

describe('VehiculeCosts', () => {
  let component: VehiculeCosts;
  let fixture: ComponentFixture<VehiculeCosts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeCosts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeCosts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
