import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturesFournisseurs } from './factures-fournisseurs';

describe('FacturesFournisseurs', () => {
  let component: FacturesFournisseurs;
  let fixture: ComponentFixture<FacturesFournisseurs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturesFournisseurs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturesFournisseurs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
