import { Injectable } from '@angular/core';
import { FormGroup, FormArray } from '@angular/forms';
import {
  RECIPES, FAT_TYPES, EMULSIFIER_TYPES,
  TOLERANCE, RETURNABLE_LIMIT,
  PROTEIN_FRACTION_OF_NONFAT_DM, CASEIN_PROTEIN_FRACTION, REQ_FIELDS,
} from '../constants/recipe.constants';
import { CalcResult, CtlRow, FieldStatus, PreviewSection, PreviewRow, SectionStatus } from '../models/ui.model';

const empty = (text: string): FieldStatus => ({ cls: '', helperText: text, helperCls: 'helper' });
const warn  = (text: string): FieldStatus => ({ cls: 'warn', helperText: text, helperCls: 'helper warn-txt' });
const ok    = (text: string): FieldStatus => ({ cls: 'ok', helperText: text, helperCls: 'helper ok-txt' });

@Injectable({ providedIn: 'root' })
export class BatchCalcService {

  recalc(form: FormGroup): CalcResult {
    const warns: string[] = [];
    const perevary    = form.get('perevary')    as FormArray;
    const fats        = form.get('fats')        as FormArray;
    const emulsifiers = form.get('emulsifiers') as FormArray;

    const waterSum       = this.v(form, 'm_direct_water') + this.v(form, 'm_steam_water');
    const balTotal       = this.totalBatch(form, perevary, fats, emulsifiers);
    const balIngredients = this.sumIngredients(form, perevary, fats, emulsifiers);

    const phStatus       = this.checkPh(form, warns);
    const moistureStatus = this.checkMoisture(form, warns);
    const t2Status       = this.checkT2(form, warns);
    const deadStatus     = this.checkDead(form, warns);
    const saltStatus     = this.checkSalt(form, warns);
    const steamStatus    = this.checkSteam(form, warns);
    const m3Status       = this.checkM3(form, warns, balTotal);

    const returnable     = this.calcReturnable(form, perevary, balTotal, warns);
    const recipeCtl      = this.calcRecipeControl(form, fats, emulsifiers, perevary, warns);
    const progress       = this.calcProgress(form);
    const secStatuses    = this.calcSectionStatuses(form, perevary, fats, emulsifiers, warns);

    return {
      phStatus, moistureStatus, t2Status, deadStatus, saltStatus, steamStatus, m3Status,
      waterSum, balTotal, balIngredients,
      ...returnable, ...progress,
      warnings: warns,
      recipeCtlLevel1:     recipeCtl.level1,
      recipeCtlLevel2:     recipeCtl.level2,
      recipeCtlNote:       recipeCtl.note,
      showRecipeCtlLevel2: recipeCtl.showLevel2,
      recipeCtlNoRecipe:   recipeCtl.noRecipe,
      recipeCtlIsCustom:   recipeCtl.isCustom,
      secStatuses,
    };
  }

  // ── Field checks ─────────────────────────────────────────────────────

  private checkPh(form: FormGroup, w: string[]): FieldStatus {
    const raw = form.get('ph_kalyata')?.value;
    if (!raw && raw !== 0) return empty('целевой 5.2–5.6');
    const v = this.v(form, 'ph_kalyata');
    if (v < 5.2 || v > 5.6) {
      w.push(`pH кальяты ${v.toFixed(2)} вне диапазона 5.2–5.6`);
      return warn(`pH ${v.toFixed(2)} вне 5.2–5.6 — нужна коррекция A3112`);
    }
    return ok('в норме');
  }

  private checkMoisture(form: FormGroup, w: string[]): FieldStatus {
    const raw = form.get('moisture_kalyata')?.value;
    if (!raw && raw !== 0) return empty('целевая 54.6%, 52–58');
    const v = this.v(form, 'moisture_kalyata');
    if (v < 52 || v > 58) {
      w.push(`Влажность кальяты ${v.toFixed(1)}% вне диапазона 52–58%`);
      return warn(`влажность ${v.toFixed(1)}% вне 52–58%`);
    }
    return ok('в норме');
  }

  private checkT2(form: FormGroup, w: string[]): FieldStatus {
    const raw = form.get('T2')?.value;
    if (!raw && raw !== 0) return empty('≤74 °C — лимит оборудования');
    const v = this.v(form, 'T2');
    if (v > 74) {
      w.push(`T₂ ${v.toFixed(1)} °C превышает лимит 74 °C`);
      return warn(`T₂ ${v.toFixed(1)} °C превышает 74 °C`);
    }
    return ok('в норме');
  }

  private checkDead(form: FormGroup, w: string[]): FieldStatus {
    const raw = form.get('m_dead')?.value;
    if (raw === null || raw === undefined || raw === '') return empty('норматив ~5 кг (3–7)');
    const v = this.v(form, 'm_dead');
    if (v < 3 || v > 7) {
      w.push(`Мёртвый остаток ${v.toFixed(1)} кг отклоняется от норматива ~5`);
      return warn(`${v.toFixed(1)} кг — отклонение от ~5 (3–7)`);
    }
    return ok('в норме');
  }

  private checkSalt(form: FormGroup, w: string[]): FieldStatus {
    const v = this.v(form, 'm_salt');
    if (!v) return empty('~3.6 кг на 300 кг базы (1.2%)');
    if (v < 3.0 || v > 4.2) {
      w.push(`NaCl ${v.toFixed(2)} кг отклоняется от ~3.6 (3.0–4.2)`);
      return warn(`${v.toFixed(2)} кг — норматив ~3.6 (3.0–4.2)`);
    }
    return ok('в норме');
  }

  private checkSteam(form: FormGroup, w: string[]): FieldStatus {
    const v = this.v(form, 'm_steam_water');
    if (!v) return empty('мин. 20 кг по тензометрии');
    if (v < 20) {
      w.push(`Подача пара ${v.toFixed(1)} кг ниже минимума 20`);
      return warn(`${v.toFixed(1)} кг — ниже минимума 20`);
    }
    return ok('в норме');
  }

  private checkM3(form: FormGroup, w: string[], expected: number): FieldStatus {
    const raw = form.get('M3')?.value;
    if (!raw && raw !== 0) return empty('тензометрия котла');
    if (expected === 0)    return empty('тензометрия котла');
    const v = this.v(form, 'M3');
    const dev = Math.abs(v - expected) / expected;
    if (dev > 0.02) {
      w.push(`М₃ ${v.toFixed(1)} отклоняется от расчётной массы ${expected.toFixed(1)} на ${(dev * 100).toFixed(1)}%`);
      return warn(`ожидание ${expected.toFixed(1)} (откл. ${(dev * 100).toFixed(1)}%)`);
    }
    return ok('соответствует расчёту');
  }

  // ── Returnable ───────────────────────────────────────────────────────

  private calcReturnable(form: FormGroup, perevary: FormArray, total: number, w: string[]) {
    const m_dead      = this.v(form, 'm_dead');
    const perevarySum = perevary.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0);
    const returnable  = m_dead + perevarySum;
    const pct         = total > 0 ? (returnable / total) * 100 : 0;
    const returnableOk = pct <= RETURNABLE_LIMIT * 100;
    if (!returnableOk) w.push(`Возврат ${pct.toFixed(1)}% превышает лимит 5% от массы варки`);
    return {
      returnablePct:    pct,
      returnableKg:     returnable,
      returnableDetail: `Н₀ (${m_dead.toFixed(1)}) + Σ переваров (${perevarySum.toFixed(1)}) = ${returnable.toFixed(1)} кг от ${total.toFixed(1)} кг`,
      returnableOk,
    };
  }

  // ── Recipe control ───────────────────────────────────────────────────

  private calcRecipeControl(
    form: FormGroup, fats: FormArray, emulsifiers: FormArray, perevary: FormArray, w: string[]
  ) {
    const recipe   = form.get('recipe')?.value;
    const noRecipe = !recipe;
    const isCustom = recipe === 'Custom';
    const none     = { level1: [] as CtlRow[], level2: [] as CtlRow[], note: '', showLevel2: false, noRecipe, isCustom };

    if (!recipe || recipe === 'Custom') return none;
    const R = RECIPES[recipe];
    if (!R?.ingredients) return none;

    const fat_total_fact = fats.controls.reduce((s, c) => {
      const t = FAT_TYPES.find(x => x.value === c.get('type')?.value);
      return s + (parseFloat(c.get('mass')?.value) || 0) * (t ? t.dry_fraction : 1);
    }, 0);

    const fact: Record<string, number> = {
      fat_total:       fat_total_fact,
      casein:          this.v(form, 'm_casein'),
      starch:          this.v(form, 'm_starch'),
      salt:            this.v(form, 'm_salt'),
      emulsifier_total: emulsifiers.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0),
      other:           this.v(form, 'm_other'),
    };
    const labels1: Record<string, string> = {
      fat_total: 'Жир (сухой экв.)', casein: 'Казеин', starch: 'Крахмал',
      salt: 'Соль NaCl', emulsifier_total: 'Соли-плавители', other: 'Прочее',
    };

    const level1: CtlRow[] = [];
    for (const k of Object.keys(R.ingredients)) {
      const norm = R.ingredients[k], f = fact[k], delta = f - norm;
      const dev  = norm > 0 ? Math.abs(delta) / norm : (f > 0 ? 1 : 0);
      let cls = 'ok', badge = 'OK';
      if (norm === 0 && f === 0) { cls = 'dim'; badge = '—'; }
      else if (dev > TOLERANCE) {
        cls = 'warn'; badge = `±${(dev * 100).toFixed(1)}%`;
        w.push(`${labels1[k]}: отклонение ${(dev * 100).toFixed(1)}% от рецептуры`);
      }
      level1.push({ label: labels1[k], norm, fact: f, delta, devPct: dev * 100, cls, badge });
    }

    const M5 = this.v(form, 'M5');
    if (M5 <= 0) return { level1, level2: [], note: 'Заполните М₅ в разделе 08 для расчёта пропорций', showLevel2: false, noRecipe, isCustom };

    const kal = this.calcKalyataComps(form);
    const perevarComps = perevary.controls.map(c => this.calcPerevarComps({
      mass: parseFloat(c.get('mass')?.value) || 0,
      moisture: parseFloat(c.get('moisture')?.value) || 0,
      fat_sv: parseFloat(c.get('fat_sv')?.value) || 0,
      starch: parseFloat(c.get('starch')?.value) || 0,
    }));

    const total_in   = this.totalBatch(form, perevary, fats, emulsifiers);
    const water_loss = Math.max(0, total_in - M5);
    const total_fat  = kal.fat + fat_total_fact + perevarComps.reduce((s, c) => s + c.fat, 0);
    const total_prot = kal.protein + this.v(form, 'm_casein') * CASEIN_PROTEIN_FRACTION + perevarComps.reduce((s, c) => s + c.protein, 0);
    const total_carbs = this.v(form, 'm_starch') + perevarComps.reduce((s, c) => s + c.carbs, 0);
    const total_water = kal.water + perevarComps.reduce((s, c) => s + c.water, 0) +
      this.v(form, 'm_direct_water') + this.v(form, 'm_steam_water') - water_loss;
    const dm_M5 = Math.max(0.0001, M5 - total_water);

    const fact2: Record<string, number> = {
      fat:     (total_fat  / dm_M5) * 100,
      protein: (total_prot / M5)    * 100,
      water:   (total_water / M5)   * 100,
      carbs:   (total_carbs / M5)   * 100,
    };
    const labels2: Record<string, string> = {
      fat: 'Жир (FDM, % на СВ)', protein: 'Белок (% абс.)',
      water: 'Вода (% абс.)', carbs: 'Углеводы (% абс.)',
    };

    const note   = `М₅ ${M5.toFixed(1)} кг · СВ ≈ ${dm_M5.toFixed(1)} кг · загрузка ${total_in.toFixed(1)} · потери ${water_loss.toFixed(1)}`;
    const level2: CtlRow[] = [];
    for (const k of ['fat', 'protein', 'water', 'carbs']) {
      const norm = R.final_pct![k], f = fact2[k], delta = f - norm;
      const dev  = norm > 0 ? Math.abs(delta) / norm : 0;
      let cls = 'ok', badge = 'OK';
      if (dev > TOLERANCE) {
        cls = 'warn'; badge = `±${(dev * 100).toFixed(1)}%`;
        w.push(`${labels2[k]}: отклонение ${(dev * 100).toFixed(1)}% от рецептуры`);
      }
      level2.push({ label: labels2[k], norm, fact: f, delta, devPct: dev * 100, cls, badge });
    }

    return { level1, level2, note, showLevel2: true, noRecipe, isCustom };
  }

  // ── Progress ─────────────────────────────────────────────────────────

  private calcProgress(form: FormGroup) {
    const total  = REQ_FIELDS.length;
    const filled = REQ_FIELDS.filter(id => this.has(form, id)).length;
    return { progressPct: total > 0 ? Math.round((filled / total) * 100) : 0, progressFilled: filled, progressTotal: total };
  }

  // ── Section statuses ─────────────────────────────────────────────────

  private calcSectionStatuses(
    form: FormGroup, perevary: FormArray, fats: FormArray, emulsifiers: FormArray, warns: string[]
  ): Record<string, SectionStatus> {
    const s = (ids: string[]) => ids.filter(id => this.has(form, id)).length;
    const ss: Record<string, SectionStatus> = {};

    const n01 = s(['operator', 'machine', 'recipe', 'recipe_fat']);
    ss['01'] = { text: `${n01}/4`, complete: n01 === 4, warn: false };

    const n02 = s(['m_kalyata', 'ph_kalyata', 'moisture_kalyata', 'fat_kalyata', 'kalyata_fat_type']);
    ss['02'] = { text: `${n02}/5`, complete: n02 === 5, warn: false };

    const pt = perevary.length;
    const pf = perevary.controls.filter(c => c.get('mass')?.value && c.get('recipe')?.value).length;
    ss['03'] = { text: pt === 0 ? '0 шт' : `${pf}/${pt}`, complete: pt > 0 && pf === pt, warn: false };

    const nf = fats.controls.filter(c => c.get('type')?.value && parseFloat(c.get('mass')?.value) > 0).length;
    ss['04'] = { text: nf === 0 ? '0 шт' : `${nf} шт`, complete: nf > 0, warn: false };

    const ne  = emulsifiers.controls.filter(c => c.get('type')?.value && parseFloat(c.get('mass')?.value) > 0).length;
    const n05 = (ne > 0 ? 1 : 0) + (this.v(form, 'm_starch') > 0 ? 1 : 0) + (this.v(form, 'm_salt') > 0 ? 1 : 0);
    ss['05'] = { text: `${n05}/3`, complete: n05 === 3, warn: false };

    const n06 = (this.v(form, 'm_direct_water') > 0 ? 1 : 0) + (this.v(form, 'm_steam_water') > 0 ? 1 : 0);
    ss['06'] = { text: `${n06}/2`, complete: n06 === 2, warn: false };

    const n07 = s(['t_load', 't_unload', 'T1', 'T2', 'T3']);
    ss['07'] = { text: `${n07}/5`, complete: n07 === 5, warn: false };

    const n08 = s(['M3', 'M4', 'M5', 'N', 't_weighing']);
    ss['08'] = { text: `${n08}/5`, complete: n08 === 5, warn: false };

    ss['09'] = { text: '—', complete: false, warn: warns.length > 0 };
    return ss;
  }

  // ── Preview sections ─────────────────────────────────────────────────

  buildPreviewSections(form: FormGroup, systemId: string): PreviewSection[] {
    const v   = form.getRawValue();
    const row = (label: string, value: unknown, unit = ''): PreviewRow => {
      const s = value !== null && value !== undefined && value !== '' ? String(value) : '';
      return { label, value: s ? (unit ? `${s} ${unit}` : s) : '—' };
    };
    const recipeFatMap: Record<string, string> = { milk: 'Молочный', vegetable: 'Растительный', mixed: 'Смешанный' };
    const kalyataFatMap: Record<string, string> = { milk: 'Молочный', vegetable: 'Растительный', skim: 'Калята обезжиренная' };
    const sourceMap: Record<string, string>     = { stab_bath: 'Из ванны стабилизации', storage: 'Со склада' };

    const s01: PreviewSection = { title: '01 · Идентификация варки', rows: [
      row('Системный ID', systemId),
      row('Дата варки', v['brew_date']),
      row('Оператор', v['operator']),
      row('Стрейчмарина', v['machine']),
      row('Источник кальяты', sourceMap[v['source_kalyata']] ?? v['source_kalyata']),
      row('Рецептура', v['recipe']),
      row('Жир рецептуры', recipeFatMap[v['recipe_fat']] ?? v['recipe_fat']),
      row('Измельчение', v['grinding_done'] ? 'Да' : 'Нет'),
    ]};
    if (v['free_id']) s01.rows.push(row('Свободный ID', v['free_id']));

    const s02: PreviewSection = { title: '02 · Кальята в котле', rows: [
      row('Масса кальяты', v['m_kalyata'], 'кг'),
      row('pH кальяты', v['ph_kalyata']),
      row('Влажность кальяты', v['moisture_kalyata'], '%'),
      row('Жирность кальяты (% на СВ)', v['fat_kalyata'], '%'),
      row('Тип жира в кальяте', kalyataFatMap[v['kalyata_fat_type']] ?? v['kalyata_fat_type']),
    ]};
    if (v['m_casein']) s02.rows.push(row('Казеин', v['m_casein'], 'кг'));

    const s03: PreviewSection = { title: '03 · Возвратное сырьё', rows: [row('Мёртвый остаток (Н₀)', v['m_dead'], 'кг')] };
    (v['perevary'] as Array<Record<string, unknown>>).forEach((p, i) => {
      if (p['mass']) s03.rows.push(row(`Переварка ${i + 1}`, `${p['mass']} кг · ${p['recipe'] || '?'}`));
    });

    const s04: PreviewSection = { title: '04 · Жировая фаза', rows: [] };
    (v['fats'] as Array<Record<string, unknown>>).forEach((f, i) => {
      if (f['mass']) s04.rows.push(row(`Жир ${i + 1}: ${FAT_TYPES.find(x => x.value === f['type'])?.label ?? f['type']}`, f['mass'], 'кг'));
    });

    const s05: PreviewSection = { title: '05 · Гидроколлоид и соли', rows: [] };
    (v['emulsifiers'] as Array<Record<string, unknown>>).forEach((e, i) => {
      if (e['mass']) s05.rows.push(row(`Соль-плавитель ${i + 1}: ${EMULSIFIER_TYPES.find(x => x.value === e['type'])?.label ?? e['type']}`, e['mass'], 'кг'));
    });
    if (v['m_starch']) s05.rows.push(row('Крахмал', v['m_starch'], 'кг'));
    if (v['m_salt'])   s05.rows.push(row('Соль NaCl', v['m_salt'], 'кг'));

    const s06: PreviewSection = { title: '06 · Микро и вода', rows: [] };
    if (v['m_preservative']) s06.rows.push(row('Консервант', v['m_preservative'], 'кг'));
    if (v['m_other'])        s06.rows.push(row('Прочие ингредиенты', v['m_other'], 'кг'));
    s06.rows.push(row('Вода прямого залива', v['m_direct_water'], 'кг'));
    s06.rows.push(row('Вода в виде пара', v['m_steam_water'], 'кг'));

    const s07: PreviewSection = { title: '07 · Хронология варки', rows: [
      row('Начало загрузки в СМ', v['t_load']),
      row('Начало выгрузки', v['t_unload']),
      row('T₁ (перед паром)', v['T1'], '°C'),
      row('T₂ (максимальная)', v['T2'], '°C'),
      row('T₃ (перед выпуском)', v['T3'], '°C'),
    ]};

    const s08: PreviewSection = { title: '08 · Контроль масс', rows: [
      row('М₃ (до пара)', v['M3'], 'кг'),
      row('М₄ (перед выпуском)', v['M4'], 'кг'),
      row('М₅ (перед охлаждением)', v['M5'], 'кг'),
      row('N (количество блоков)', v['N']),
      row('Время взвешивания', v['t_weighing']),
    ]};

    return [s01, s02, s03, s04, s05, s06, s07, s08];
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private totalBatch(form: FormGroup, perevary: FormArray, fats: FormArray, emulsifiers: FormArray): number {
    return this.v(form, 'm_kalyata') + this.v(form, 'm_dead') + this.sumIngredients(form, perevary, fats, emulsifiers);
  }

  private sumIngredients(form: FormGroup, perevary: FormArray, fats: FormArray, emulsifiers: FormArray): number {
    return fats.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0)
      + emulsifiers.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0)
      + perevary.controls.reduce((s, c) => s + (parseFloat(c.get('mass')?.value) || 0), 0)
      + this.v(form, 'm_casein') + this.v(form, 'm_starch') + this.v(form, 'm_salt')
      + this.v(form, 'm_preservative') + this.v(form, 'm_other')
      + this.v(form, 'm_direct_water') + this.v(form, 'm_steam_water');
  }

  private calcKalyataComps(form: FormGroup) {
    const m = this.v(form, 'm_kalyata'), w = this.v(form, 'moisture_kalyata'), fSV = this.v(form, 'fat_kalyata');
    const dm = Math.max(0, 100 - w), fat_wet = dm * fSV / 100;
    const prot_wet = Math.max(0, (dm - fat_wet) * PROTEIN_FRACTION_OF_NONFAT_DM);
    return { water: m * w / 100, fat: m * fat_wet / 100, protein: m * prot_wet / 100 };
  }

  private calcPerevarComps(p: { mass: number; moisture: number; fat_sv: number; starch: number }) {
    const dm = Math.max(0, 100 - p.moisture), fat_wet = dm * p.fat_sv / 100;
    const prot_wet = Math.max(0, dm - fat_wet - p.starch) * PROTEIN_FRACTION_OF_NONFAT_DM;
    return { water: p.mass * p.moisture / 100, fat: p.mass * fat_wet / 100, protein: p.mass * prot_wet / 100, carbs: p.mass * p.starch / 100 };
  }

  v(form: FormGroup, key: string): number {
    return parseFloat(String(form.get(key)?.value ?? '').replace(',', '.')) || 0;
  }

  has(form: FormGroup, id: string): boolean {
    const vv = form.get(id)?.value;
    return vv !== null && vv !== undefined && String(vv).trim() !== '';
  }
}
