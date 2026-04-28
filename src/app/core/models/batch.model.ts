export interface RecipeDef {
  code: string;
  ingredients: Record<string, number> | null;
  final_pct: Record<string, number> | null;
}

export type RecipeMap = Record<string, RecipeDef>;

export interface FatType {
  value: string;
  label: string;
  dry_fraction: number;
}

export interface EmulsifierType {
  value: string;
  label: string;
}

export interface PerevarRow {
  mass: number | null;
  recipe: string;
  moisture: number | null;
  fat_sv: number | null;
  starch: number | null;
}

export interface FatRow {
  type: string;
  mass: number | null;
}

export interface EmulsifierRow {
  type: string;
  mass: number | null;
}

export interface BatchRecord {
  system_id: string;
  free_id: string;
  brew_date: string;
  operator: string;
  machine: string;
  source_kalyata: string;
  recipe: string;
  recipe_fat: string;
  grinding_done: boolean;
  m_kalyata: number | null;
  ph_kalyata: number | null;
  moisture_kalyata: number | null;
  fat_kalyata: number | null;
  kalyata_fat_type: string;
  m_casein: number | null;
  m_dead: number | null;
  perevary: PerevarRow[];
  fats: FatRow[];
  emulsifiers: EmulsifierRow[];
  starch_type: string;
  m_starch: number | null;
  m_salt: number | null;
  m_preservative: number | null;
  m_other: number | null;
  m_direct_water: number | null;
  m_steam_water: number | null;
  t_load: string;
  t_unload: string;
  T1: number | null;
  T2: number | null;
  T3: number | null;
  M3: number | null;
  M4: number | null;
  M5: number | null;
  N: number | null;
  t_weighing: string;
  saved_at: string;
}
