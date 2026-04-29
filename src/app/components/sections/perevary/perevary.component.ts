import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormArray, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { FieldStatus, EMPTY_STATUS } from '../../../core/models/ui.model';
import { PEREVAR_RECIPES, RECIPES } from '../../../core/constants/recipe.constants';

@Component({
  selector: 'app-section-perevary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './perevary.component.html',
})
export class PerevarComponent {
  @Input() perevary!: FormArray;
  @Input() deadStatus: FieldStatus = EMPTY_STATUS('норматив ~5 кг (3–7)');

  @Output() addPerevar    = new EventEmitter<void>();
  @Output() removePerevar = new EventEmitter<number>();
  @Output() recipeChange  = new EventEmitter<{ i: number; value: string }>();

  readonly perevarRecipes = PEREVAR_RECIPES;

  isPerevarCustom(i: number): boolean {
    return this.perevary.at(i).get('recipe')?.value === 'Custom';
  }

  onRecipeChange(i: number, value: string): void {
    this.recipeChange.emit({ i, value });
  }
}
