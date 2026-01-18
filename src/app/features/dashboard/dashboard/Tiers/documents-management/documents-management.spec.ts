import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentsManagement } from './documents-management';

describe('DocumentsManagement', () => {
  let component: DocumentsManagement;
  let fixture: ComponentFixture<DocumentsManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentsManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
