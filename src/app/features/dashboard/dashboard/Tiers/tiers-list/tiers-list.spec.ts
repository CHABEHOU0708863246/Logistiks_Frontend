import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiersList } from './tiers-list';

describe('TiersList', () => {
  let component: TiersList;
  let fixture: ComponentFixture<TiersList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiersList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiersList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
