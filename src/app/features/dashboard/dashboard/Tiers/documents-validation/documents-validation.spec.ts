import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsValidation } from './documents-validation';

describe('DocumentsValidation', () => {
  let component: DocumentsValidation;
  let fixture: ComponentFixture<DocumentsValidation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsValidation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentsValidation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
