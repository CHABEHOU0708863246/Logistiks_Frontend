import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogWithInput } from './confirm-dialog-with-input';

describe('ConfirmDialogWithInput', () => {
  let component: ConfirmDialogWithInput;
  let fixture: ComponentFixture<ConfirmDialogWithInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogWithInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogWithInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
