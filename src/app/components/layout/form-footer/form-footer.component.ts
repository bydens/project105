import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-footer.component.html',
})
export class FormFooterComponent {
  @Input() showPreview      = false;
  @Input() progressFilled   = 0;
  @Input() progressTotal    = 0;
  @Input() progressPct      = 0;
  @Input() systemId         = '';
  @Input() validationError  = '';
  @Input() submitError      = '';
  @Input() submitting       = false;
  @Input() hasSavedRecords  = false;

  @Output() resetForm     = new EventEmitter<void>();
  @Output() downloadJson  = new EventEmitter<void>();
  @Output() saveRecord    = new EventEmitter<void>();
  @Output() cancelAndClear = new EventEmitter<void>();
  @Output() closePreview  = new EventEmitter<void>();
  @Output() submitRecord  = new EventEmitter<void>();
}
