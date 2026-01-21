import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirm-dialog-with-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './confirm-dialog-with-input.html',
  styleUrl: './confirm-dialog-with-input.scss',
})
export class ConfirmDialogWithInput {
@Input() title = 'Confirmation';
  @Input() message = 'Êtes-vous sûr de vouloir effectuer cette action ?';
  @Input() details = '';
  @Input() confirmText = 'Confirmer';
  @Input() cancelText = 'Annuler';
  @Input() visible = false;
  @Input() showInput = false;
  @Input() inputPlaceholder = 'Saisissez la raison...';
  @Input() inputValue = '';
  @Input() inputRequired = false;
  @Input() inputErrorMessage = 'Ce champ est obligatoire';

  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  inputValid = true;

  onConfirm() {
    if (this.showInput && this.inputRequired && !this.inputValue.trim()) {
      this.inputValid = false;
      return;
    }

    this.inputValid = true;
    this.confirm.emit(this.inputValue);
    this.visible = false;
    this.inputValue = '';
  }

  onCancel() {
    this.cancel.emit();
    this.visible = false;
    this.inputValue = '';
    this.inputValid = true;
  }
}
