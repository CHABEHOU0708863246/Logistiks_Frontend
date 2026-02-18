import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatistiquesFlotte } from './statistiques-flotte';

describe('StatistiquesFlotte', () => {
  let component: StatistiquesFlotte;
  let fixture: ComponentFixture<StatistiquesFlotte>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatistiquesFlotte]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatistiquesFlotte);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
