import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TierForm } from './tier-form';

describe('TierForm', () => {
  let component: TierForm;
  let fixture: ComponentFixture<TierForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TierForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TierForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
