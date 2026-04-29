import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus, EMPTY_STATUS } from '../../../core/models/ui.model';

@Component({
  selector: 'app-section-chronology',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './chronology.component.html',
})
export class ChronologyComponent {
  @Input() t2Status: FieldStatus = EMPTY_STATUS('≤74 °C — лимит оборудования');
}
