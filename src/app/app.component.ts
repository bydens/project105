import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { CalcResult } from './core/models/ui.model';
import { BatchRecord, PbBatchRecord } from './core/models/batch.model';
import { BatchCalcService } from './core/services/batch-calc.service';
import { BatchService } from './core/services/batch.service';
import { RECIPES, REQ_FIELDS } from './core/constants/recipe.constants';

import { AppHeaderComponent, AppPage } from './components/layout/app-header/app-header.component';
import { StatusBarComponent } from './components/layout/status-bar/status-bar.component';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { FormFooterComponent } from './components/layout/form-footer/form-footer.component';
import { IdentificationComponent } from './components/sections/identification/identification.component';
import { KalyataComponent } from './components/sections/kalyata/kalyata.component';
import { PerevarComponent } from './components/sections/perevary/perevary.component';
import { FatsComponent } from './components/sections/fats/fats.component';
import { HydrocolloidsComponent } from './components/sections/hydrocolloids/hydrocolloids.component';
import { WaterMicroComponent } from './components/sections/water-micro/water-micro.component';
import { ChronologyComponent } from './components/sections/chronology/chronology.component';
import { MassControlComponent } from './components/sections/mass-control/mass-control.component';
import { RecipeControlComponent } from './components/sections/recipe-control/recipe-control.component';
import { PreviewComponent } from './components/preview/preview.component';
import { SavedRecordsComponent } from './components/saved-records/saved-records.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    AppHeaderComponent, StatusBarComponent, SidebarComponent, FormFooterComponent,
    IdentificationComponent, KalyataComponent, PerevarComponent,
    FatsComponent, HydrocolloidsComponent, WaterMicroComponent,
    ChronologyComponent, MassControlComponent, RecipeControlComponent,
    PreviewComponent, SavedRecordsComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  form!: FormGroup;
  private sub = new Subscription();
  private observer?: IntersectionObserver;

  page: AppPage = 'form';
  editingId: string | null = null;

  systemId     = '';
  autosaveText = 'черновик · не сохранено';
  showPreview  = false;
  submitting   = false;
  submitError  = '';
  validationError = '';
  savedRecords: PbBatchRecord[] = [];

  calc: CalcResult = this.emptyCalc();

  private dailyCounter: Record<string, number> = {};

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private calcSvc: BatchCalcService,
    private batchSvc: BatchService,
  ) {}

  ngOnInit(): void {
    const iso = this.toIsoDate(new Date());
    this.form = this.fb.group({
      brew_date:      [iso],
      free_id:        [''],
      operator:       ['', Validators.required],
      machine:        ['', Validators.required],
      source_kalyata: ['stab_bath'],
      recipe:         ['', Validators.required],
      recipe_fat:     ['', Validators.required],
      grinding_done:  [true],

      m_kalyata:         ['', Validators.required],
      ph_kalyata:        ['', Validators.required],
      moisture_kalyata:  ['', Validators.required],
      fat_kalyata:       ['', Validators.required],
      kalyata_fat_type:  ['', Validators.required],
      m_casein:          [''],

      m_dead:   [5],
      perevary: this.fb.array([]),
      fats:     this.fb.array([this.createFatGroup()]),

      emulsifiers: this.fb.array([this.createEmulsifierGroup()]),
      starch_type: ['kmc_high_melt'],
      m_starch:    [''],
      m_salt:      [''],

      m_preservative:  [''],
      m_other:         [''],
      m_direct_water:  [''],
      m_steam_water:   [''],

      t_load:    ['', Validators.required],
      t_unload:  ['', Validators.required],
      T1: ['', Validators.required],
      T2: ['', Validators.required],
      T3: ['', Validators.required],

      M3: ['', Validators.required],
      M4: ['', Validators.required],
      M5: ['', Validators.required],
      N:  ['', Validators.required],
      t_weighing: ['', Validators.required],
    });

    this.sub.add(this.form.valueChanges.pipe(debounceTime(60)).subscribe(() => this.recalc()));
    this.sub.add(this.form.get('recipe')!.valueChanges.subscribe(() => this.regenerateSystemId()));

    this.regenerateSystemId();
    this.recalc();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) this.cdr.detectChanges(); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.form-section[id]').forEach(s => this.observer!.observe(s));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.observer?.disconnect();
  }

  // ── FormArrays ───────────────────────────────────────────────────────

  get perevary():    FormArray { return this.form.get('perevary')    as FormArray; }
  get fats():        FormArray { return this.form.get('fats')        as FormArray; }
  get emulsifiers(): FormArray { return this.form.get('emulsifiers') as FormArray; }

  private createFatGroup():        FormGroup { return this.fb.group({ type: [''], mass: [''] }); }
  private createEmulsifierGroup(): FormGroup { return this.fb.group({ type: [''], mass: [''] }); }
  private createPerevarGroup():    FormGroup { return this.fb.group({ mass: [''], recipe: [''], moisture: [''], fat_sv: [''], starch: [''] }); }

  addPerevar():        void { this.perevary.push(this.createPerevarGroup()); }
  removePerevar(i: number): void { this.perevary.removeAt(i); }

  addFat():        void { if (this.fats.length < 2) this.fats.push(this.createFatGroup()); }
  removeFat(i: number): void { this.fats.removeAt(i); }

  addEmulsifier():        void { if (this.emulsifiers.length < 4) this.emulsifiers.push(this.createEmulsifierGroup()); }
  removeEmulsifier(i: number): void { this.emulsifiers.removeAt(i); }

  onPerevarRecipeChange(event: { i: number; value: string }): void {
    const row = this.perevary.at(event.i) as FormGroup;
    if (!event.value || event.value === 'Custom') {
      row.patchValue({ moisture: '', fat_sv: '', starch: '' }, { emitEvent: false });
    } else {
      const R = RECIPES[event.value];
      if (R?.final_pct) {
        row.patchValue({ moisture: R.final_pct['water'], fat_sv: R.final_pct['fat'], starch: R.final_pct['carbs'] }, { emitEvent: false });
      }
    }
    this.recalc();
  }

  // ── Recalc ───────────────────────────────────────────────────────────

  private recalc(): void {
    if (!this.form) return;
    this.calc = this.calcSvc.recalc(this.form);
  }

  // ── System ID ────────────────────────────────────────────────────────

  regenerateSystemId(): void {
    const recipe = this.form?.get('recipe')?.value || '';
    const ds = this.toYMD(new Date());
    const code = RECIPES[recipe]?.code || '??';
    if (!this.dailyCounter[ds]) this.dailyCounter[ds] = 0;
    this.systemId = `${ds}-${code}-${String(this.dailyCounter[ds] + 1).padStart(3, '0')}`;
  }

  // ── Save / Submit ────────────────────────────────────────────────────

  saveRecord(): void {
    this.form.markAllAsTouched();
    const missing = REQ_FIELDS.filter(id => !this.calcSvc.has(this.form, id));
    if (missing.length > 0) {
      this.validationError = `Не заполнено полей: ${missing.length}`;
      setTimeout(() => {
        document.querySelector<HTMLElement>('.inp.ng-invalid.ng-touched')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    this.validationError = '';
    this.submitError = '';
    this.showPreview = true;
  }

  closePreview(): void { this.showPreview = false; }

  submitRecord(): void {
    const payload: BatchRecord = {
      ...this.form.getRawValue(),
      system_id: this.systemId,
      saved_at:  new Date().toISOString(),
    };
    this.submitting  = true;
    this.submitError = '';
    const isEdit = !!this.editingId;
    const obs = isEdit
      ? this.batchSvc.update(this.editingId!, payload)
      : this.batchSvc.create(payload);
    obs.subscribe({
      next:  (saved) => this.finalizeSubmit(saved, isEdit),
      error: (err: unknown) => {
        this.submitting  = false;
        const e = err as { status?: number; statusText?: string; message?: string };
        this.submitError = `Ошибка ${e.status ?? ''}: ${e.statusText || e.message || 'нет ответа от сервера'}`.trim();
      },
    });
  }

  private finalizeSubmit(record: PbBatchRecord, wasEdit: boolean): void {
    this.submitting  = false;
    this.showPreview = false;
    this.editingId   = null;
    if (!wasEdit) {
      this.savedRecords.push(record);
      const ds = this.toYMD(new Date());
      this.dailyCounter[ds] = (this.dailyCounter[ds] || 0) + 1;
    }
    this.autosaveText = `сохранено · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    this.form.markAsUntouched();
    this.regenerateSystemId();
    this.recalc();
  }

  cancelAndClear(): void {
    this.showPreview = false;
    this.validationError = '';
    this.editingId = null;
    this.resetFormState();
  }

  onEditRecord(id: string): void {
    this.batchSvc.getOne(id).subscribe({
      next: (rec) => {
        this.editingId = id;
        this.page = 'form';
        this.showPreview = false;
        this.validationError = '';
        this.submitError = '';

        while (this.perevary.length)    this.perevary.removeAt(0);
        while (this.fats.length)        this.fats.removeAt(0);
        while (this.emulsifiers.length) this.emulsifiers.removeAt(0);

        (rec.perevary ?? []).forEach(p =>
          this.perevary.push(this.fb.group({ mass: [p.mass], recipe: [p.recipe], moisture: [p.moisture], fat_sv: [p.fat_sv], starch: [p.starch] }))
        );
        (rec.fats ?? []).forEach(f =>
          this.fats.push(this.fb.group({ type: [f.type], mass: [f.mass] }))
        );
        if (this.fats.length === 0) this.fats.push(this.createFatGroup());

        (rec.emulsifiers ?? []).forEach(e =>
          this.emulsifiers.push(this.fb.group({ type: [e.type], mass: [e.mass] }))
        );
        if (this.emulsifiers.length === 0) this.emulsifiers.push(this.createEmulsifierGroup());

        this.form.patchValue({
          brew_date: rec.brew_date, free_id: rec.free_id,
          operator: rec.operator, machine: rec.machine,
          source_kalyata: rec.source_kalyata, recipe: rec.recipe,
          recipe_fat: rec.recipe_fat, grinding_done: rec.grinding_done,
          m_kalyata: rec.m_kalyata, ph_kalyata: rec.ph_kalyata,
          moisture_kalyata: rec.moisture_kalyata, fat_kalyata: rec.fat_kalyata,
          kalyata_fat_type: rec.kalyata_fat_type, m_casein: rec.m_casein,
          m_dead: rec.m_dead, starch_type: rec.starch_type,
          m_starch: rec.m_starch, m_salt: rec.m_salt,
          m_preservative: rec.m_preservative, m_other: rec.m_other,
          m_direct_water: rec.m_direct_water, m_steam_water: rec.m_steam_water,
          t_load: rec.t_load, t_unload: rec.t_unload,
          T1: rec.T1, T2: rec.T2, T3: rec.T3,
          M3: rec.M3, M4: rec.M4, M5: rec.M5, N: rec.N,
          t_weighing: rec.t_weighing,
        });

        this.systemId = rec.system_id;
        this.autosaveText = `редактирование · ${rec.system_id}`;
        this.form.markAsUntouched();
        this.recalc();
      },
      error: (err: unknown) => {
        const e = err as { status?: number; message?: string };
        alert(`Не удалось загрузить запись: ${e.status ?? ''} ${e.message ?? ''}`.trim());
      },
    });
  }

  resetForm(): void {
    if (!confirm('Очистить все поля формы?')) return;
    this.validationError = '';
    this.editingId = null;
    this.resetFormState();
  }

  private resetFormState(): void {
    this.form.markAsUntouched();
    this.form.reset({
      brew_date: this.toIsoDate(new Date()), source_kalyata: 'stab_bath',
      starch_type: 'kmc_high_melt', grinding_done: true, m_dead: 5,
    });
    while (this.perevary.length)    this.perevary.removeAt(0);
    while (this.fats.length)        this.fats.removeAt(0);
    while (this.emulsifiers.length) this.emulsifiers.removeAt(0);
    this.fats.push(this.createFatGroup());
    this.emulsifiers.push(this.createEmulsifierGroup());
    this.regenerateSystemId();
    this.recalc();
  }

  downloadJson(): void { this.batchSvc.downloadJson(this.savedRecords); }

  removeRecord(i: number): void {
    const rec = this.savedRecords[i];
    if (!confirm(`Удалить запись ${rec.system_id}?`)) return;
    this.batchSvc.delete(rec.id).subscribe({
      next: () => { this.savedRecords.splice(i, 1); this.recalc(); },
      error: (err: unknown) => {
        const e = err as { status?: number; message?: string };
        alert(`Не удалось удалить запись на сервере: ${e.status ?? ''} ${e.message ?? ''}`.trim());
      },
    });
  }

  // ── Template helpers ─────────────────────────────────────────────────

  get freeId(): string { return this.form?.get('free_id')?.value ?? ''; }

  get m1Show(): string { return (this.calcSvc.v(this.form, 'm_dead')).toFixed(2); }

  get totFats():  number { return this.fats.controls.filter(c => parseFloat(c.get('mass')?.value) > 0).length; }
  get totEmuls(): number { return this.emulsifiers.controls.filter(c => parseFloat(c.get('mass')?.value) > 0).length; }

  get previewSections() { return this.calcSvc.buildPreviewSections(this.form, this.systemId); }

  // ── Utils ────────────────────────────────────────────────────────────

  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toYMD(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  private emptyCalc(): CalcResult {
    const s = { cls: '', helperText: '', helperCls: 'helper' };
    return {
      phStatus: s, moistureStatus: s, t2Status: s, deadStatus: s, saltStatus: s, steamStatus: s, m3Status: s,
      waterSum: 0, balTotal: 0, balIngredients: 0,
      returnablePct: 0, returnableKg: 0, returnableDetail: '', returnableOk: true,
      progressPct: 0, progressFilled: 0, progressTotal: REQ_FIELDS.length,
      warnings: [], recipeCtlLevel1: [], recipeCtlLevel2: [],
      recipeCtlNote: '', showRecipeCtlLevel2: false, recipeCtlNoRecipe: true, recipeCtlIsCustom: false,
      secStatuses: {},
    };
  }
}
