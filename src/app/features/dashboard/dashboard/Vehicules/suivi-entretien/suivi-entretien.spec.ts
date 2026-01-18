import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviEntretien } from './suivi-entretien';

describe('SuiviEntretien', () => {
  let component: SuiviEntretien;
  let fixture: ComponentFixture<SuiviEntretien>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuiviEntretien]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuiviEntretien);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
