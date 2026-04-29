import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus } from '../../../core/models/ui.model';
import { EMPTY_STATUS } from '../../../core/models/ui.model';

@Component({
  selector: 'app-section-kalyata',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './kalyata.component.html',
})
export class KalyataComponent {
  @Input() phStatus:       FieldStatus = EMPTY_STATUS('целевой 5.2–5.6');
  @Input() moistureStatus: FieldStatus = EMPTY_STATUS('целевая 54.6%, 52–58');
}
