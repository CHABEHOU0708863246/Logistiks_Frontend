import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarMaintenance } from './calendar-maintenance';

describe('CalendarMaintenance', () => {
  let component: CalendarMaintenance;
  let fixture: ComponentFixture<CalendarMaintenance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarMaintenance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarMaintenance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
