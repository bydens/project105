import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { OPERATORS, RECIPES } from '../../../core/constants/recipe.constants';

@Component({
  selector: 'app-section-identification',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './identification.component.html',
})
export class IdentificationComponent {
  @Input() systemId = '';

  readonly operators   = OPERATORS;
  readonly recipeNames = Object.keys(RECIPES);

  get grindingDone(): boolean {
    return !!(this.fgd.form?.get('grinding_done')?.value);
  }

  toggleGrinding(): void {
    const c = this.fgd.form.get('grinding_done')!;
    c.setValue(!c.value, { emitEvent: true });
  }

  constructor(private fgd: FormGroupDirective) {}
}
