import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

const RECIPES: Record<string, any> = {
  'S-Economy': { code: 'SE', ingredients: { fat_total: 60, casein: 0, starch: 30, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 36.0, protein: 14, water: 50, carbs: 14 } },
  'Economy':   { code: 'EC', ingredients: { fat_total: 55, casein: 0, starch: 22, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 37.3, protein: 16, water: 49, carbs: 12 } },
  'Ordinary':  { code: 'OR', ingredients: { fat_total: 60, casein: 0, starch: 15, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 40.4, protein: 19, water: 48, carbs: 8  } },
  'Premium':   { code: 'PR', ingredients: { fat_total: 64, casein: 0, starch:  8, salt: 3.6, emulsifier_total: 3.5, other: 0 }, final_pct: { fat: 41.5, protein: 22, water: 47, carbs: 5  } },
  'S-Premium': { code: 'SP', ingredients: { fat_total: 66, casein: 0, starch:  0, salt: 3.6, emulsifier_total: 3.4, other: 0 }, final_pct: { fat: 42.6, protein: 25, water: 46, carbs: 1  } },
  'Custom':    { code: 'CU', ingredients: null, final_pct: null }
};

const FAT_TYPES = [
  { value: 'palm',       label: 'Пальмовый',                  dry_fraction: 1.00 },
  { value: 'butter_82',  label: 'Масло 82%',                  dry_fraction: 0.82 },
  { value: 'other_milk', label: 'Другой жир (молочный)',      dry_fraction: 1.00 },
  { value: 'other_veg',  label: 'Другой жир (растительный)',  dry_fraction: 1.00 }
];

const EMULSIFIER_TYPES = [
  { value: 'joha_pz7',      label: 'Joha PZ-7'     },
  { value: 'kasomel_a3112', label: 'Kasomel A3112'  },
  { value: 'tsc',           label: 'Цитрат TSC'     },
  { value: 'tsp',           label: 'Фосфат TSP'     },
  { value: 'other',         label: 'Другой'         }
];

const PEREVAR_RECIPES = ['S-Economy', 'Economy', 'Ordinary', 'Premium', 'S-Premium', 'Custom'];
const TOLERANCE = 0.02;
const RETURNABLE_LIMIT = 0.05;
const PROTEIN_FRACTION_OF_NONFAT_DM = 0.93;
const CASEIN_PROTEIN_FRACTION = 0.88;
const FAT_LIMIT = 2;
const EMULSIFIER_LIMIT = 4;

export interface FieldStatus { cls: string; helperText: string; helperCls: string; }
export interface CtlRow { label: string; norm: number; fact: number; delta: number; devPct: number; cls: string; badge: string; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  form!: FormGroup;
  private sub = new Subscription();
  private observer?: IntersectionObserver;

  // Constants exposed to template
  readonly recipeNames = Object.keys(RECIPES);
  readonly fatTypes = FAT_TYPES;
  readonly emulsifierTypes = EMULSIFIER_TYPES;
  readonly perevarRecipes = PEREVAR_RECIPES;
  readonly operators = ['Иванов А.И.', 'Петров В.В.', 'Сидоров С.С.', 'Кузнецов А.В.', 'Смирнов В.В.'];
  readonly fatLimit = FAT_LIMIT;
  readonly emulsLimit = EMULSIFIER_LIMIT;

  // State
  systemId = '';
  autosaveText = 'черновик · не сохранено';
  warnings: string[] = [];
  savedRecords: any[] = [];
  activeSec = '01';

  // Field statuses
  phStatus: FieldStatus     = { cls: '', helperText: 'целевой 5.2–5.6', helperCls: 'helper' };
  moistureStatus: FieldStatus = { cls: '', helperText: 'целевая 54.6%, 52–58', helperCls: 'helper' };
  t2Status: FieldStatus     = { cls: '', helperText: '≤74 °C — лимит оборудования', helperCls: 'helper' };
  deadStatus: FieldStatus   = { cls: '', helperText: 'норматив ~5 кг (3–7)', helperCls: 'helper' };
  saltStatus: FieldStatus   = { cls: '', helperText: '~3.6 кг на 300 кг базы (1.2%)', helperCls: 'helper' };
  steamStatus: FieldStatus  = { cls: '', helperText: 'мин. 20 кг по тензометрии', helperCls: 'helper' };
  m3Status: FieldStatus     = { cls: '', helperText: 'тензометрия котла', helperCls: 'helper' };

  validationError = '';

  // Computed values
  waterSum = 0;
  balTotal = 0;
  balIngredients = 0;
  returnablePct = 0;
  returnableKg = 0;
  returnableDetail = 'Н₀ + Σ переваров: 0.0 кг от 0.0 кг';
  returnableOk = true;
  progressPct = 0;
  progressFilled = 0;
  progressTotal = 0;

  // Recipe control
  recipeCtlLevel1: CtlRow[] = [];
  recipeCtlLevel2: CtlRow[] = [];
  recipeCtlNote = '';
  showRecipeCtlLevel2 = false;
  recipeCtlNoRecipe = true;
  recipeCtlIsCustom = false;

  // Section nav statuses
  secStatuses: Record<string, { text: string; complete: boolean; warn: boolean }> = {};

  private dailyCounter: Record<string, number> = {};

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const today = new Date();
    const iso = this.toIsoDate(today);

    this.form = this.fb.group({
      brew_date: [iso],
      free_id: [''],
      operator: ['', Validators.required],
      machine: ['', Validators.required],
      source_kalyata: ['stab_bath'],
      recipe: ['', Validators.required],
      recipe_fat: ['', Validators.required],
      grinding_done: [true],

      m_kalyata: ['', Validators.required],
      ph_kalyata: ['', Validators.required],
      moisture_kalyata: ['', Validators.required],
      fat_kalyata: ['', Validators.required],
      kalyata_fat_type: ['', Validators.required],
      m_casein: [''],

      m_dead: [5],
      perevary: this.fb.array([]),

      fats: this.fb.array([this.createFatGroup()]),

      emulsifiers: this.fb.array([this.createEmulsifierGroup()]),
      starch_type: ['kmc_high_melt'],
      m_starch: [''],
      m_salt: [''],

      m_preservative: [''],
      m_other: [''],
      m_direct_water: [''],
      m_steam_water: [''],

      t_load: ['', Validators.required],
      t_unload: ['', Validators.required],
      T1: ['', Validators.required],
      T2: ['', Validators.required],
      T3: ['', Validators.required],

      M3: ['', Validators.required],
      M4: ['', Validators.required],
      M5: ['', Validators.required],
      N: ['', Validators.required],
      t_weighing: ['', Validators.required],
    });

    this.sub.add(
      this.form.valueChanges.pipe(debounceTime(60)).subscribe(() => this.recalc())
    );
    this.sub.add(
      this.form.get('recipe')!.valueChanges.subscribe(() => this.regenerateSystemId())
    );

    this.regenerateSystemId();
    this.recalc();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id.replace('sec-', '');
          this.activeSec = id;
          this.cdr.detectChanges();
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    document.querySelectorAll('.form-section[id]').forEach(s => this.observer!.observe(s));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.observer?.disconnect();
  }

  // ── Form arrays ──────────────────────────────────────────────────
  get perevary(): FormArray { return this.form.get('perevary') as FormArray; }
  get fats():     FormArray { return this.form.get('fats')     as FormArray; }
  get emulsifiers(): FormArray { return this.form.get('emulsifiers') as FormArray; }

  createPerevarGroup(): FormGroup {
    return this.fb.group({ mass: [''], recipe: [''], moisture: [''], fat_sv: [''], starch: [''] });
  }
  createFatGroup(): FormGroup {
    return this.fb.group({ type: [''], mass: [''] });
  }
  createEmulsifierGroup(): FormGroup {
    return this.fb.group({ type: [''], mass: [''] });
  }

  addPerevar(): void { this.perevary.push(this.createPerevarGroup()); }
  removePerevar(i: number): void { this.perevary.removeAt(i); }

  addFat(): void { if (this.fats.length < FAT_LIMIT) this.fats.push(this.createFatGroup()); }
  removeFat(i: number): void { this.fats.removeAt(i); }

  addEmulsifier(): void { if (this.emulsifiers.length < EMULSIFIER_LIMIT) this.emulsifiers.push(this.createEmulsifierGroup()); }
  removeEmulsifier(i: number): void { this.emulsifiers.removeAt(i); }

  onPerevarRecipeChange(i: number, recipeName: string): void {
    const row = this.perevary.at(i) as FormGroup;
    if (!recipeName) {
      row.patchValue({ moisture: '', fat_sv: '', starch: '' }, { emitEvent: false });
    } else if (recipeName === 'Custom') {
      row.patchValue({ moisture: '', fat_sv: '', starch: '' }, { emitEvent: false });
    } else {
      const R = RECIPES[recipeName];
      if (R?.final_pct) {
        row.patchValue({ moisture: R.final_pct.water, fat_sv: R.final_pct.fat, starch: R.final_pct.carbs }, { emitEvent: false });
      }
    }
    this.recalc();
  }

  isPerevarCustom(i: number): boolean {
    return (this.perevary.at(i) as FormGroup).get('recipe')?.value === 'Custom';
  }

  toggleGrinding(): void {
    const c = this.form.get('grinding_done')!;
    c.setValue(!c.value, { emitEvent: false });
  }

  // ── System ID ────────────────────────────────────────────────────
  regenerateSystemId(): void {
    const recipe = this.form?.get('recipe')?.value || '';
    const today = new Date();
    const ds = this.toYMD(today);
    const code = RECIPES[recipe]?.code || '??';
    if (!this.dailyCounter[ds]) this.dailyCounter[ds] = 0;
    const num = String(this.dailyCounter[ds] + 1).padStart(3, '0');
    this.systemId = `${ds}-${code}-${num}`;
  }

  // ── Core recalc ──────────────────────────────────────────────────
  recalc(): void {
    if (!this.form) return;
    const warns: string[] = [];

    this.waterSum = this.v('m_direct_water') + this.v('m_steam_water');
    this.balTotal = this.totalBatchMass();
    this.balIngredients = this.sumIngredients();

    this.checkPh(warns);
    this.checkMoisture(warns);
    this.checkT2(warns);
    this.checkDead(warns);
    this.checkSalt(warns);
    this.checkSteam(warns);
    this.checkM3(warns);

    this.renderReturnableControl(warns);
    this.renderRecipeControl(warns);
    this.updateProgress();
    this.updateSectionStatuses();

    this.warnings = warns;
  }

  // ── Checks ───────────────────────────────────────────────────────
  private checkPh(w: string[]): void {
    const raw = this.form.get('ph_kalyata')?.value;
    if (!raw && raw !== 0) { this.phStatus = { cls: '', helperText: 'целевой 5.2–5.6', helperCls: 'helper' }; return; }
    const v = this.v('ph_kalyata');
    if (v < 5.2 || v > 5.6) {
      this.phStatus = { cls: 'warn', helperText: `pH ${v.toFixed(2)} вне 5.2–5.6 — нужна коррекция A3112`, helperCls: 'helper warn-txt' };
      w.push(`pH кальяты ${v.toFixed(2)} вне диапазона 5.2–5.6`);
    } else {
      this.phStatus = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkMoisture(w: string[]): void {
    const raw = this.form.get('moisture_kalyata')?.value;
    if (!raw && raw !== 0) { this.moistureStatus = { cls: '', helperText: 'целевая 54.6%, 52–58', helperCls: 'helper' }; return; }
    const v = this.v('moisture_kalyata');
    if (v < 52 || v > 58) {
      this.moistureStatus = { cls: 'warn', helperText: `влажность ${v.toFixed(1)}% вне 52–58%`, helperCls: 'helper warn-txt' };
      w.push(`Влажность кальяты ${v.toFixed(1)}% вне диапазона 52–58%`);
    } else {
      this.moistureStatus = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkT2(w: string[]): void {
    const raw = this.form.get('T2')?.value;
    if (!raw && raw !== 0) { this.t2Status = { cls: '', helperText: '≤74 °C — лимит оборудования', helperCls: 'helper' }; return; }
    const v = this.v('T2');
    if (v > 74) {
      this.t2Status = { cls: 'warn', helperText: `T₂ ${v.toFixed(1)} °C превышает 74 °C`, helperCls: 'helper warn-txt' };
      w.push(`T₂ ${v.toFixed(1)} °C превышает лимит 74 °C`);
    } else {
      this.t2Status = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkDead(w: string[]): void {
    const raw = this.form.get('m_dead')?.value;
    if (raw === null || raw === undefined || raw === '') { this.deadStatus = { cls: '', helperText: 'норматив ~5 кг (3–7)', helperCls: 'helper' }; return; }
    const v = this.v('m_dead');
    if (v < 3 || v > 7) {
      this.deadStatus = { cls: 'warn', helperText: `${v.toFixed(1)} кг — отклонение от ~5 (3–7)`, helperCls: 'helper warn-txt' };
      w.push(`Мёртвый остаток ${v.toFixed(1)} кг отклоняется от норматива ~5`);
    } else {
      this.deadStatus = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkSalt(w: string[]): void {
    const v = this.v('m_salt');
    if (!v) { this.saltStatus = { cls: '', helperText: '~3.6 кг на 300 кг базы (1.2%)', helperCls: 'helper' }; return; }
    if (v < 3.0 || v > 4.2) {
      this.saltStatus = { cls: 'warn', helperText: `${v.toFixed(2)} кг — норматив ~3.6 (3.0–4.2)`, helperCls: 'helper warn-txt' };
      w.push(`NaCl ${v.toFixed(2)} кг отклоняется от ~3.6 (3.0–4.2)`);
    } else {
      this.saltStatus = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkSteam(w: string[]): void {
    const v = this.v('m_steam_water');
    if (!v) { this.steamStatus = { cls: '', helperText: 'мин. 20 кг по тензометрии', helperCls: 'helper' }; return; }
    if (v < 20) {
      this.steamStatus = { cls: 'warn', helperText: `${v.toFixed(1)} кг — ниже минимума 20`, helperCls: 'helper warn-txt' };
      w.push(`Подача пара ${v.toFixed(1)} кг ниже минимума 20`);
    } else {
      this.steamStatus = { cls: 'ok', helperText: 'в норме', helperCls: 'helper ok-txt' };
    }
  }

  private checkM3(w: string[]): void {
    const raw = this.form.get('M3')?.value;
    if (!raw && raw !== 0) { this.m3Status = { cls: '', helperText: 'тензометрия котла', helperCls: 'helper' }; return; }
    const v = this.v('M3');
    const expected = this.totalBatchMass();
    if (expected === 0) { this.m3Status = { cls: '', helperText: 'тензометрия котла', helperCls: 'helper' }; return; }
    const dev = Math.abs(v - expected) / expected;
    if (dev > 0.02) {
      this.m3Status = { cls: 'warn', helperText: `ожидание ${expected.toFixed(1)} (откл. ${(dev*100).toFixed(1)}%)`, helperCls: 'helper warn-txt' };
      w.push(`М₃ ${v.toFixed(1)} отклоняется от расчётной массы ${expected.toFixed(1)} на ${(dev*100).toFixed(1)}%`);
    } else {
      this.m3Status = { cls: 'ok', helperText: 'соответствует расчёту', helperCls: 'helper ok-txt' };
    }
  }

  // ── Returnable ───────────────────────────────────────────────────
  private renderReturnableControl(w: string[]): void {
    const m_dead = this.v('m_dead');
    const perevarySum = this.perevary.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0);
    const returnable = m_dead + perevarySum;
    const total = this.totalBatchMass();
    const pct = total > 0 ? returnable / total * 100 : 0;
    this.returnablePct = pct;
    this.returnableKg  = returnable;
    this.returnableDetail = `Н₀ (${m_dead.toFixed(1)}) + Σ переваров (${perevarySum.toFixed(1)}) = ${returnable.toFixed(1)} кг от ${total.toFixed(1)} кг`;
    this.returnableOk = pct <= RETURNABLE_LIMIT * 100;
    if (!this.returnableOk) w.push(`Возврат ${pct.toFixed(1)}% превышает лимит 5% от массы варки`);
  }

  // ── Recipe control ───────────────────────────────────────────────
  private renderRecipeControl(w: string[]): void {
    const recipe = this.form.get('recipe')?.value;
    this.recipeCtlLevel1 = [];
    this.recipeCtlLevel2 = [];
    this.recipeCtlNote   = '';
    this.showRecipeCtlLevel2 = false;
    this.recipeCtlNoRecipe = !recipe;
    this.recipeCtlIsCustom = recipe === 'Custom';

    if (!recipe || recipe === 'Custom') return;

    const R = RECIPES[recipe];
    if (!R?.ingredients) return;

    const fat_total_fact = this.fats.controls.reduce((s, c) => {
      const t = FAT_TYPES.find(x => x.value === c.get('type')?.value);
      return s + (parseFloat(c.get('mass')?.value) || 0) * (t ? t.dry_fraction : 1);
    }, 0);

    const fact: Record<string, number> = {
      fat_total: fat_total_fact,
      casein: this.v('m_casein'),
      starch: this.v('m_starch'),
      salt: this.v('m_salt'),
      emulsifier_total: this.emulsifiers.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0),
      other: this.v('m_other')
    };

    const labels1: Record<string, string> = {
      fat_total: 'Жир (сухой экв.)', casein: 'Казеин', starch: 'Крахмал',
      salt: 'Соль NaCl', emulsifier_total: 'Соли-плавители', other: 'Прочее'
    };

    for (const k of Object.keys(R.ingredients)) {
      const norm = R.ingredients[k]; const f = fact[k]; const delta = f - norm;
      const dev = norm > 0 ? Math.abs(delta) / norm : (f > 0 ? 1 : 0);
      let cls = 'ok', badge = 'OK';
      if (norm === 0 && f === 0) { cls = 'dim'; badge = '—'; }
      else if (dev > TOLERANCE) {
        cls = 'warn'; badge = `±${(dev*100).toFixed(1)}%`;
        w.push(`${labels1[k]}: отклонение ${(dev*100).toFixed(1)}% от рецептуры`);
      }
      this.recipeCtlLevel1.push({ label: labels1[k], norm, fact: f, delta, devPct: dev*100, cls, badge });
    }

    const M5 = this.v('M5');
    if (M5 <= 0) {
      this.recipeCtlNote = 'Заполните М₅ в разделе 08 для расчёта пропорций';
      return;
    }

    this.showRecipeCtlLevel2 = true;
    const kal = this.calcKalyataComps();
    const perevarComps = this.perevary.controls.map(c => this.calcPerevarComps({
      mass: parseFloat(c.get('mass')?.value) || 0,
      moisture: parseFloat(c.get('moisture')?.value) || 0,
      fat_sv: parseFloat(c.get('fat_sv')?.value) || 0,
      starch: parseFloat(c.get('starch')?.value) || 0
    }));
    const total_fat = kal.fat + fat_total_fact + perevarComps.reduce((s, c) => s + c.fat, 0);
    const total_protein = kal.protein + this.v('m_casein') * CASEIN_PROTEIN_FRACTION + perevarComps.reduce((s, c) => s + c.protein, 0);
    const total_carbs = this.v('m_starch') + perevarComps.reduce((s, c) => s + c.carbs, 0);
    const total_in = this.totalBatchMass();
    const water_loss = Math.max(0, total_in - M5);
    const total_water = kal.water + perevarComps.reduce((s, c) => s + c.water, 0) +
      this.v('m_direct_water') + this.v('m_steam_water') - water_loss;
    const dm_M5 = Math.max(0.0001, M5 - total_water);

    const fact2: Record<string, number> = {
      fat: total_fat / dm_M5 * 100, protein: total_protein / M5 * 100,
      water: total_water / M5 * 100, carbs: total_carbs / M5 * 100
    };
    const labels2: Record<string, string> = {
      fat: 'Жир (FDM, % на СВ)', protein: 'Белок (% абс.)',
      water: 'Вода (% абс.)', carbs: 'Углеводы (% абс.)'
    };

    this.recipeCtlNote = `М₅ ${M5.toFixed(1)} кг · СВ продукта ≈ ${dm_M5.toFixed(1)} кг · загрузка ${total_in.toFixed(1)} · потери ${water_loss.toFixed(1)}`;

    for (const k of ['fat', 'protein', 'water', 'carbs']) {
      const norm = R.final_pct[k]; const f = fact2[k]; const delta = f - norm;
      const dev = norm > 0 ? Math.abs(delta) / norm : 0;
      let cls = 'ok', badge = 'OK';
      if (dev > TOLERANCE) {
        cls = 'warn'; badge = `±${(dev*100).toFixed(1)}%`;
        w.push(`${labels2[k]}: отклонение ${(dev*100).toFixed(1)}% от рецептуры`);
      }
      this.recipeCtlLevel2.push({ label: labels2[k], norm, fact: f, delta, devPct: dev*100, cls, badge });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private calcKalyataComps() {
    const m = this.v('m_kalyata'), w = this.v('moisture_kalyata'), fSV = this.v('fat_kalyata');
    const dm = Math.max(0, 100 - w), fat_wet = dm * fSV / 100;
    const prot_wet = Math.max(0, (dm - fat_wet) * PROTEIN_FRACTION_OF_NONFAT_DM);
    return { water: m * w / 100, fat: m * fat_wet / 100, protein: m * prot_wet / 100 };
  }

  private calcPerevarComps(p: { mass: number; moisture: number; fat_sv: number; starch: number }) {
    const dm = Math.max(0, 100 - p.moisture), fat_wet = dm * p.fat_sv / 100;
    const prot_wet = Math.max(0, dm - fat_wet - p.starch) * PROTEIN_FRACTION_OF_NONFAT_DM;
    return {
      water: p.mass * p.moisture / 100, fat: p.mass * fat_wet / 100,
      protein: p.mass * prot_wet / 100, carbs: p.mass * p.starch / 100
    };
  }

  private totalBatchMass(): number {
    return this.v('m_kalyata') + this.v('m_dead') + this.sumIngredients();
  }

  private sumIngredients(): number {
    return this.fats.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0) +
      this.emulsifiers.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0) +
      this.perevary.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0) +
      this.v('m_casein') + this.v('m_starch') + this.v('m_salt') +
      this.v('m_preservative') + this.v('m_other') +
      this.v('m_direct_water') + this.v('m_steam_water');
  }

  private v(key: string): number {
    return parseFloat(String(this.form.get(key)?.value ?? '').replace(',', '.')) || 0;
  }

  // ── Progress & section statuses ──────────────────────────────────
  private readonly REQ = ['operator','machine','recipe','recipe_fat',
    'm_kalyata','ph_kalyata','moisture_kalyata','fat_kalyata','kalyata_fat_type',
    't_load','t_unload','T1','T2','T3','M3','M4','M5','N','t_weighing'];

  private updateProgress(): void {
    const total = this.REQ.length;
    const filled = this.REQ.filter(id => {
      const vv = this.form.get(id)?.value;
      return vv !== null && vv !== undefined && String(vv).trim() !== '';
    }).length;
    this.progressPct    = total > 0 ? Math.round(filled / total * 100) : 0;
    this.progressFilled = filled;
    this.progressTotal  = total;
  }

  private has(id: string): boolean {
    const vv = this.form.get(id)?.value;
    return vv !== null && vv !== undefined && String(vv).trim() !== '';
  }

  private updateSectionStatuses(): void {
    const s = (ids: string[]) => ids.filter(id => this.has(id)).length;
    const ss: Record<string, { text: string; complete: boolean; warn: boolean }> = {};

    const n01 = s(['operator','machine','recipe','recipe_fat']);
    ss['01'] = { text: `${n01}/4`, complete: n01 === 4, warn: false };

    const n02 = s(['m_kalyata','ph_kalyata','moisture_kalyata','fat_kalyata','kalyata_fat_type']);
    ss['02'] = { text: `${n02}/5`, complete: n02 === 5, warn: false };

    const pt = this.perevary.length;
    const pf = this.perevary.controls.filter(c => c.get('mass')?.value && c.get('recipe')?.value).length;
    ss['03'] = { text: pt === 0 ? '0 шт' : `${pf}/${pt}`, complete: pt > 0 && pf === pt, warn: false };

    const nf = this.fats.controls.filter(c => c.get('type')?.value && parseFloat(c.get('mass')?.value) > 0).length;
    ss['04'] = { text: nf === 0 ? '0 шт' : `${nf} шт`, complete: nf > 0, warn: false };

    const ne = this.emulsifiers.controls.filter(c => c.get('type')?.value && parseFloat(c.get('mass')?.value) > 0).length;
    const n05 = (ne > 0 ? 1 : 0) + (this.v('m_starch') > 0 ? 1 : 0) + (this.v('m_salt') > 0 ? 1 : 0);
    ss['05'] = { text: `${n05}/3`, complete: n05 === 3, warn: false };

    const n06 = (this.v('m_direct_water') > 0 ? 1 : 0) + (this.v('m_steam_water') > 0 ? 1 : 0);
    ss['06'] = { text: `${n06}/2`, complete: n06 === 2, warn: false };

    const n07 = s(['t_load','t_unload','T1','T2','T3']);
    ss['07'] = { text: `${n07}/5`, complete: n07 === 5, warn: false };

    const n08 = s(['M3','M4','M5','N','t_weighing']);
    ss['08'] = { text: `${n08}/5`, complete: n08 === 5, warn: false };

    ss['09'] = { text: '—', complete: false, warn: this.warnings.length > 0 };

    this.secStatuses = ss;
  }

  // ── Save / Reset / Download ──────────────────────────────────────
  saveRecord(): void {
    this.form.markAllAsTouched();
    const missing = this.REQ.filter(id => !this.has(id));
    if (missing.length > 0) {
      this.validationError = `Не заполнено полей: ${missing.length}`;
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('.inp.ng-invalid.ng-touched');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    this.validationError = '';
    const record = { ...this.form.getRawValue(), system_id: this.systemId, saved_at: new Date().toISOString() };
    this.savedRecords.push(record);
    const ds = this.toYMD(new Date());
    this.dailyCounter[ds] = (this.dailyCounter[ds] || 0) + 1;
    this.autosaveText = `сохранено · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    this.form.markAsUntouched();
    this.regenerateSystemId();
    this.recalc();
  }

  resetForm(): void {
    if (!confirm('Очистить все поля формы?')) return;
    this.validationError = '';
    this.form.markAsUntouched();
    const iso = this.toIsoDate(new Date());
    this.form.reset({
      brew_date: iso, source_kalyata: 'stab_bath', starch_type: 'kmc_high_melt',
      grinding_done: true, m_dead: 5, m_casein: '', m_starch: '', m_salt: '',
      m_preservative: '', m_other: '', m_direct_water: '', m_steam_water: ''
    });
    while (this.perevary.length) this.perevary.removeAt(0);
    while (this.fats.length) this.fats.removeAt(0);
    while (this.emulsifiers.length) this.emulsifiers.removeAt(0);
    this.fats.push(this.createFatGroup());
    this.emulsifiers.push(this.createEmulsifierGroup());
    this.regenerateSystemId();
    this.recalc();
  }

  downloadJson(): void {
    if (!this.savedRecords.length) { alert('Нет сохранённых записей'); return; }
    const blob = new Blob([JSON.stringify(this.savedRecords, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `F3_strech_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  removeRecord(i: number): void {
    if (confirm('Удалить запись ' + this.savedRecords[i].system_id + '?')) {
      this.savedRecords.splice(i, 1);
      this.recalc();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  fmt(n: number | null | undefined, d = 1): string {
    if (n === null || n === undefined || !isFinite(n)) return '—';
    return (n >= 0 ? '' : '') + n.toFixed(d);
  }

  fmtDelta(n: number, d = 1): string {
    if (!isFinite(n)) return '—';
    return (n > 0 ? '+' : '') + n.toFixed(d);
  }

  get M1show(): string { return this.v('m_dead').toFixed(2); }

  get sideMachinePill(): string {
    const m = this.form?.get('machine')?.value;
    return m ? (m === 'SM-1' ? 'СМ-1' : 'СМ-2') : 'СМ —';
  }

  get sideMachinePillEmpty(): boolean { return !this.form?.get('machine')?.value; }

  get sideSession(): string {
    const t = this.form?.get('t_load')?.value;
    const op = this.form?.get('operator')?.value;
    return (t ? `Начата ${t}` : 'Не начата') + (op ? ` · ${op}` : '');
  }

  get balReturnableStr(): string {
    return `${this.returnablePct.toFixed(1)}% (${this.returnableKg.toFixed(1)} кг)`;
  }

  get grindingDone(): boolean { return !!this.form?.get('grinding_done')?.value; }

  get totPerevary(): number { return this.perevary.length; }
  get totFats(): number { return this.fats.controls.filter(c => parseFloat(c.get('mass')?.value) > 0).length; }
  get totEmuls(): number { return this.emulsifiers.controls.filter(c => parseFloat(c.get('mass')?.value) > 0).length; }

  perevarRecipeIsCustom(val: string): boolean { return val === 'Custom'; }

  private toIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private toYMD(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  }
}
