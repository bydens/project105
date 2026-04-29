import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormArray, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus, EMPTY_STATUS } from '../../../core/models/ui.model';
import { EMULSIFIER_TYPES, EMULSIFIER_LIMIT } from '../../../core/constants/recipe.constants';

@Component({
  selector: 'app-section-hydrocolloids',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './hydrocolloids.component.html',
})
export class HydrocolloidsComponent {
  @Input() emulsifiers!: FormArray;
  @Input() saltStatus: FieldStatus = EMPTY_STATUS('~3.6 кг на 300 кг базы (1.2%)');

  @Output() addEmulsifier    = new EventEmitter<void>();
  @Output() removeEmulsifier = new EventEmitter<number>();

  readonly emulsifierTypes = EMULSIFIER_TYPES;
  readonly emulsLimit      = EMULSIFIER_LIMIT;
}
