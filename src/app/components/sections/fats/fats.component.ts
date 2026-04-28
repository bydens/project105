import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormArray, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FAT_TYPES, FAT_LIMIT } from '../../../core/constants/recipe.constants';

@Component({
  selector: 'app-section-fats',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './fats.component.html',
})
export class FatsComponent {
  @Input() fats!: FormArray;

  @Output() addFat    = new EventEmitter<void>();
  @Output() removeFat = new EventEmitter<number>();

  readonly fatTypes = FAT_TYPES;
  readonly fatLimit = FAT_LIMIT;
}
