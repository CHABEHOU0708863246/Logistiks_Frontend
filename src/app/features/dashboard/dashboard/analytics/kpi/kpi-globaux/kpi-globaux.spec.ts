import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpiGlobaux } from './kpi-globaux';

describe('KpiGlobaux', () => {
  let component: KpiGlobaux;
  let fixture: ComponentFixture<KpiGlobaux>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiGlobaux]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpiGlobaux);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
