import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VehiculeDocuments } from './vehicule-documents';

describe('VehiculeDocuments', () => {
  let component: VehiculeDocuments;
  let fixture: ComponentFixture<VehiculeDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VehiculeDocuments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VehiculeDocuments);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
