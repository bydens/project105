export interface FieldStatus {
  cls: string;
  helperText: string;
  helperCls: string;
}

export interface CtlRow {
  label: string;
  norm: number;
  fact: number;
  delta: number;
  devPct: number;
  cls: string;
  badge: string;
}

export interface PreviewRow {
  label: string;
  value: string;
}

export interface PreviewSection {
  title: string;
  rows: PreviewRow[];
}

export interface SectionStatus {
  text: string;
  complete: boolean;
  warn: boolean;
}

export interface CalcResult {
  phStatus: FieldStatus;
  moistureStatus: FieldStatus;
  t2Status: FieldStatus;
  deadStatus: FieldStatus;
  saltStatus: FieldStatus;
  steamStatus: FieldStatus;
  m3Status: FieldStatus;
  waterSum: number;
  balTotal: number;
  balIngredients: number;
  returnablePct: number;
  returnableKg: number;
  returnableDetail: string;
  returnableOk: boolean;
  progressPct: number;
  progressFilled: number;
  progressTotal: number;
  warnings: string[];
  recipeCtlLevel1: CtlRow[];
  recipeCtlLevel2: CtlRow[];
  recipeCtlNote: string;
  showRecipeCtlLevel2: boolean;
  recipeCtlNoRecipe: boolean;
  recipeCtlIsCustom: boolean;
  secStatuses: Record<string, SectionStatus>;
}

export const EMPTY_STATUS = (text: string): FieldStatus =>
  ({ cls: '', helperText: text, helperCls: 'helper' });
