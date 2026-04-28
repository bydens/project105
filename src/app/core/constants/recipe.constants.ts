import { FatType, EmulsifierType, RecipeMap } from '../models/batch.model';

export const RECIPES: RecipeMap = {
  'S-Economy': { code: 'SE', ingredients: { fat_total: 60, casein: 0, starch: 30, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 36.0, protein: 14, water: 50, carbs: 14 } },
  'Economy':   { code: 'EC', ingredients: { fat_total: 55, casein: 0, starch: 22, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 37.3, protein: 16, water: 49, carbs: 12 } },
  'Ordinary':  { code: 'OR', ingredients: { fat_total: 60, casein: 0, starch: 15, salt: 3.6, emulsifier_total: 3.6, other: 0 }, final_pct: { fat: 40.4, protein: 19, water: 48, carbs: 8  } },
  'Premium':   { code: 'PR', ingredients: { fat_total: 64, casein: 0, starch:  8, salt: 3.6, emulsifier_total: 3.5, other: 0 }, final_pct: { fat: 41.5, protein: 22, water: 47, carbs: 5  } },
  'S-Premium': { code: 'SP', ingredients: { fat_total: 66, casein: 0, starch:  0, salt: 3.6, emulsifier_total: 3.4, other: 0 }, final_pct: { fat: 42.6, protein: 25, water: 46, carbs: 1  } },
  'Custom':    { code: 'CU', ingredients: null, final_pct: null },
};

export const FAT_TYPES: FatType[] = [
  { value: 'palm',       label: 'Пальмовый',                 dry_fraction: 1.00 },
  { value: 'butter_82',  label: 'Масло 82%',                 dry_fraction: 0.82 },
  { value: 'other_milk', label: 'Другой жир (молочный)',     dry_fraction: 1.00 },
  { value: 'other_veg',  label: 'Другой жир (растительный)', dry_fraction: 1.00 },
];

export const EMULSIFIER_TYPES: EmulsifierType[] = [
  { value: 'joha_pz7',      label: 'Joha PZ-7'    },
  { value: 'kasomel_a3112', label: 'Kasomel A3112' },
  { value: 'tsc',           label: 'Цитрат TSC'    },
  { value: 'tsp',           label: 'Фосфат TSP'    },
  { value: 'other',         label: 'Другой'        },
];

export const PEREVAR_RECIPES = ['S-Economy', 'Economy', 'Ordinary', 'Premium', 'S-Premium', 'Custom'];

export const OPERATORS = ['Иванов А.И.', 'Петров В.В.', 'Сидоров С.С.', 'Кузнецов А.В.', 'Смирнов В.В.'];

export const TOLERANCE                    = 0.02;
export const RETURNABLE_LIMIT             = 0.05;
export const PROTEIN_FRACTION_OF_NONFAT_DM = 0.93;
export const CASEIN_PROTEIN_FRACTION      = 0.88;
export const FAT_LIMIT                    = 2;
export const EMULSIFIER_LIMIT             = 4;

export const REQ_FIELDS = [
  'operator', 'machine', 'recipe', 'recipe_fat',
  'm_kalyata', 'ph_kalyata', 'moisture_kalyata', 'fat_kalyata', 'kalyata_fat_type',
  't_load', 't_unload', 'T1', 'T2', 'T3',
  'M3', 'M4', 'M5', 'N', 't_weighing',
];
