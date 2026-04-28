import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus, EMPTY_STATUS } from '../../../core/models/ui.model';

@Component({
  selector: 'app-section-mass-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './mass-control.component.html',
})
export class MassControlComponent {
  @Input() m3Status: FieldStatus = EMPTY_STATUS('тензометрия котла');
  @Input() m1Show = '0.00';
}
