import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableauBordFinancier } from './tableau-bord-financier';

describe('TableauBordFinancier', () => {
  let component: TableauBordFinancier;
  let fixture: ComponentFixture<TableauBordFinancier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableauBordFinancier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableauBordFinancier);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
