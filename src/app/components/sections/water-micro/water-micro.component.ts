import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus, EMPTY_STATUS } from '../../../core/models/ui.model';
import { fmt } from '../../../core/utils/format.utils';

@Component({
  selector: 'app-section-water-micro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './water-micro.component.html',
})
export class WaterMicroComponent {
  @Input() steamStatus: FieldStatus = EMPTY_STATUS('мин. 20 кг по тензометрии');
  @Input() waterSum = 0;

  readonly fmt = fmt;
}
