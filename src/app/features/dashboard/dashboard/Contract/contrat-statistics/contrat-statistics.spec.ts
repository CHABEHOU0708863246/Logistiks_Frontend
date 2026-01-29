import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContratStatistics } from './contrat-statistics';

describe('ContratStatistics', () => {
  let component: ContratStatistics;
  let fixture: ComponentFixture<ContratStatistics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContratStatistics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContratStatistics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
