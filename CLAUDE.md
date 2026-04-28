# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
ng serve          # Dev server at http://localhost:4200
ng build          # Production build → dist/mozzarella-form
ng test           # Unit tests via Karma/Jasmine
ng build --watch --configuration development  # Watch mode
```

## Architecture

**Angular 19 standalone app** — no routing, no state management library. Multi-component architecture with a clean core/feature separation.

### Entry points

- [src/main.ts](src/main.ts) — `bootstrapApplication(AppComponent)`
- [src/app/app.config.ts](src/app/app.config.ts) — `provideHttpClient`, `provideZoneChangeDetection`
- [src/environments/environment.ts](src/environments/environment.ts) — dev config (`apiUrl: http://localhost:3000/api`)
- [src/environments/environment.prod.ts](src/environments/environment.prod.ts) — prod config (`apiUrl: /api`), swapped via `fileReplacements` in `angular.json`

### Core layer (`src/app/core/`)

| File | Purpose |
|---|---|
| [constants/recipe.constants.ts](src/app/core/constants/recipe.constants.ts) | `RECIPES`, `FAT_TYPES`, `EMULSIFIER_TYPES`, `OPERATORS`, all numeric thresholds, `REQ_FIELDS` |
| [models/batch.model.ts](src/app/core/models/batch.model.ts) | `BatchRecord`, `PerevarRow`, `FatRow`, `EmulsifierRow`, `FatType`, `EmulsifierType`, `RecipeMap` |
| [models/ui.model.ts](src/app/core/models/ui.model.ts) | `FieldStatus`, `CtlRow`, `PreviewSection`, `CalcResult`, `SectionStatus`, `EMPTY_STATUS` |
| [utils/format.utils.ts](src/app/core/utils/format.utils.ts) | `fmt(n, d)` and `fmtDelta(n, d)` — pure formatting functions used in templates |
| [services/batch-calc.service.ts](src/app/core/services/batch-calc.service.ts) | All business logic: `recalc(form)` → `CalcResult`, `buildPreviewSections()`, mass-balance helpers |
| [services/batch.service.ts](src/app/core/services/batch.service.ts) | HTTP: `submit(record)` → `Observable<void>`, `downloadJson(records)` |

### Component tree

```
AppComponent  (root shell — form setup, state, action handlers)
├── layout/
│   ├── AppHeaderComponent       (static header)
│   ├── StatusBarComponent       (systemId, freeId, autosave pill)
│   ├── SidebarComponent         (real-time balances, summary, warnings)
│   └── FormFooterComponent      (save/submit/cancel actions, progress)
├── sections/  (each maps to one form section, uses viewProviders ControlContainer)
│   ├── IdentificationComponent  (sec-01: operator, machine, recipe, grinding)
│   ├── KalyataComponent         (sec-02: kalyata mass, pH, moisture, fat)
│   ├── PerevarComponent         (sec-03: dead weight + returnable batches table)
│   ├── FatsComponent            (sec-04: fat phase table)
│   ├── HydrocolloidsComponent   (sec-05: emulsifiers, starch, salt)
│   ├── WaterMicroComponent      (sec-06: preservative, water direct/steam)
│   ├── ChronologyComponent      (sec-07: times, T1/T2/T3)
│   ├── MassControlComponent     (sec-08: M3/M4/M5/N, weighing time)
│   └── RecipeControlComponent   (sec-09: returnable recap, level-1 & level-2 tables)
├── PreviewComponent             (inline data review before submit)
└── SavedRecordsComponent        (submitted records table)
```

### AppComponent responsibilities

[app.component.ts](src/app/app.component.ts) (~160 lines) is the **root shell only**:
- Creates and owns the flat `FormGroup` (all controls at the top level)
- Subscribes to `form.valueChanges` → `debounceTime(60)` → `BatchCalcService.recalc()` → stores `calc: CalcResult`
- Manages `showPreview`, `savedRecords`, `systemId`, `autosaveText`, `submitting`, `submitError`
- Delegates HTTP to `BatchService`, formatting to `format.utils.ts`, preview data to `BatchCalcService.buildPreviewSections()`
- Passes `@Input()` data down, listens to `@Output()` events up

## Core Patterns

**Form state**: Single flat `FormGroup` lives in `AppComponent`. Arrays `perevary`, `fats`, `emulsifiers` are `FormArray`. Changes pipe through `debounceTime(60)` → `BatchCalcService.recalc()` → `CalcResult` distributed to children via `@Input`.

**ControlContainer inheritance**: Section components declare `viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }]`. This lets them use `formControlName` / `formArrayName` / `[formGroupName]` in their templates while the `[formGroup]` stays on the `<form>` element in `AppComponent`.

**Status model**: `FieldStatus { cls, helperText, helperCls }` — CSS class (`''`, `'warn'`, `'ok'`) plus helper text. Produced by `BatchCalcService` check methods, passed to section components as `@Input`.

**Preview flow**: "Сохранить запись" validates required fields → sets `showPreview = true` → `AppComponent` switches `<main>` from form to `<app-preview>`. Submit calls `BatchService.submit()` and on success calls `finalizeSubmit()`.

**Format utils**: Import `{ fmt, fmtDelta }` from `core/utils/format.utils` and expose as `readonly fmt = fmt` in any component template that needs them. Do not duplicate inline.

## Key Business Constants

All in [src/app/core/constants/recipe.constants.ts](src/app/core/constants/recipe.constants.ts):

```typescript
TOLERANCE                     = 0.02   // 2% ingredient deviation threshold
RETURNABLE_LIMIT              = 0.05   // 5% max returnable batch ratio
PROTEIN_FRACTION_OF_NONFAT_DM = 0.93
CASEIN_PROTEIN_FRACTION       = 0.88
FAT_LIMIT                     = 2      // max fat entries in FormArray
EMULSIFIER_LIMIT              = 4      // max emulsifier entries
// pH valid range: 5.2–5.6; moisture: 52–58%; T2 ≤ 74°C; salt: 3.0–4.2 kg
```

`FAT_TYPES` entries carry `dry_fraction` (palm = 1.00, butter 82% = 0.82) used in mass-balance calculations.

## TypeScript Config

Strict mode is fully enabled (`strict`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`). Target is ES2022. Angular strict templates are on. `skipTests: true` is the Angular CLI default (no spec files generated automatically).

## Frontend Developer Guidelines (Angular)

### Adding a new form section

1. Create `src/app/components/sections/<name>/<name>.component.ts` + `.html`
2. Add `viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }]` to the `@Component` decorator
3. Import `ReactiveFormsModule` and `CommonModule`; use `formControlName` in the template directly
4. Add any new `FormControl` entries to `AppComponent.ngOnInit()` form definition
5. Add the new status check to `BatchCalcService.recalc()` and include it in `CalcResult`
6. Add the component to the `imports` array in `AppComponent` and place `<app-section-*>` in `app.component.html`
7. Run `ng build` to catch template type errors

### Adding a new service method

- HTTP calls go in `BatchService` — inject `HttpClient`, use `environment.apiUrl`
- Business calculations go in `BatchCalcService` — keep methods `private` unless called from outside; accept `FormGroup` as parameter, do not store state

### Component roles

- **Smart** (owns logic/state): only `AppComponent`
- **Dumb** (pure `@Input`/`@Output`): all section, layout, preview, and saved-records components

Section components may read from the form via `FormGroupDirective` (through `ControlContainer`) but must **never** call `recalc()` directly — they emit `@Output` events and let `AppComponent` handle state mutations.

### Reuse over duplication

- Before writing new markup, check if an existing section component covers the case
- Repeated patterns (status field + helper text) are handled by passing `FieldStatus` as `@Input` — do not inline the same `[class]="'inp ' + status.cls"` pattern in new ways
- Shared presentational components (no business logic) go in `src/app/components/shared/`

### CSS

- `app.component.css` uses `ViewEncapsulation.None` — all its rules are global and available to every child component
- Component-specific styles go in a dedicated `.css` file for that component; do not add them to `app.component.css`
- After any structural change run `ng build` to verify no template errors
