import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DepensesCategories } from './depenses-categories';

describe('DepensesCategories', () => {
  let component: DepensesCategories;
  let fixture: ComponentFixture<DepensesCategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepensesCategories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DepensesCategories);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
