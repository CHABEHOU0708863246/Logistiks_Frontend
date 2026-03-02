import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiviteMensuelle } from './activite-mensuelle';

describe('ActiviteMensuelle', () => {
  let component: ActiviteMensuelle;
  let fixture: ComponentFixture<ActiviteMensuelle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiviteMensuelle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiviteMensuelle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
