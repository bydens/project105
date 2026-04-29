import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CtlRow } from '../../../core/models/ui.model';
import { fmt, fmtDelta } from '../../../core/utils/format.utils';

@Component({
  selector: 'app-section-recipe-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-control.component.html',
})
export class RecipeControlComponent {
  @Input() recipeCtlLevel1:     CtlRow[] = [];
  @Input() recipeCtlLevel2:     CtlRow[] = [];
  @Input() recipeCtlNote        = '';
  @Input() showRecipeCtlLevel2  = false;
  @Input() recipeCtlNoRecipe    = true;
  @Input() recipeCtlIsCustom    = false;
  @Input() returnableOk         = true;
  @Input() returnableDetail     = '';
  @Input() returnablePct        = 0;

  readonly fmt      = fmt;
  readonly fmtDelta = fmtDelta;
}
