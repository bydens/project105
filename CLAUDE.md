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

**Single-component Angular 19 standalone app** — no routing, no service layer, no state management library.

- [src/app/app.component.ts](src/app/app.component.ts) — all business logic (~660 lines)
- [src/app/app.component.html](src/app/app.component.html) — full template (~696 lines)
- [src/app/app.component.css](src/app/app.component.css) — all styles (~17KB)
- [src/app/app.config.ts](src/app/app.config.ts) — minimal bootstrap config
- [src/main.ts](src/main.ts) — `bootstrapApplication(AppComponent)`

No backend integration. Data lives in component memory and is exported via `downloadJson()`.

## Core Patterns

**Form state**: Reactive Forms (`FormGroup` + `FormArray`). Form changes pipe through `debounceTime(60)` into `recalc()`, which recomputes all derived values synchronously.

**Subscriptions**: Two `valueChanges` subscriptions managed in a single `Subscription` object, cleaned up in `ngOnDestroy`. `IntersectionObserver` tracks which section is visible for sidebar nav — also disconnected on destroy.

**Status model**: `FieldStatus { cls, helperText, helperCls }` — CSS class (`''`, `'warn'`, `'ok'`, `'dim'`) plus helper text. Nearly every field has a corresponding `*Status` property populated by `recalc()`.

**Recipe system**: 5 named recipes (S-Economy → S-Premium) plus Custom. Each recipe defines ingredient targets and final composition targets (fat%, protein%, water%, carbs%). `CtlRow[]` arrays drive the recipe control tables in the template.

## Key Business Constants

```typescript
TOLERANCE = 0.02              // 2% ingredient deviation threshold
RETURNABLE_LIMIT = 0.05       // 5% max returnable batch ratio
PROTEIN_FRACTION_OF_NONFAT_DM = 0.93
CASEIN_PROTEIN_FRACTION = 0.88
// pH valid range: 5.2–5.6; moisture: 52–58%; T2 ≤ 74°C; salt: 3.0–4.2 kg
```

Fat types carry a `dryFraction` (e.g., palm = 1.00, butter 82% = 0.82) used in mass-balance calculations. Max 2 fat entries and 4 emulsifier entries in the form arrays.

## TypeScript Config

Strict mode is fully enabled (`strict`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature`). Target is ES2022. Angular strict templates are on. `skipTests: true` is the Angular CLI default for this project (no spec files generated automatically).

## Frontend Developer Guidelines (Angular)

### Component decomposition

- **Any template block exceeding ~80 lines or containing independent UI logic must be extracted into its own standalone component.**
- Name components by their role: `RecipeTableComponent`, `IngredientRowComponent`, `StatusBadgeComponent` — not generic names like `BlockComponent`.
- Every new component goes in `src/app/components/<feature>/`. Flat files under `src/app/` are only for the root `AppComponent`.
- Use `@Input()` / `@Output()` for parent–child data flow. Do not reach into a child's internals from the parent.

### Reuse over duplication

- Before writing new markup or logic, check if an existing component covers the case. If it covers 80%+ of the case, extend it rather than copy it.
- Repeated patterns (status badges, form-row wrappers, validation messages) must be extracted the second time they appear — not the third.
- Shared presentational components (no business logic, no form state) live in `src/app/components/shared/`.

### Optimal architecture

- Keep components in one of two roles: **smart** (owns form state / business logic, lives near the feature) or **dumb** (pure `@Input`/`@Output`, fully reusable). Do not mix roles in a single component.
- `AppComponent` is the root shell: layout, section routing, and top-level form setup only. Move any domain logic out of it as components are extracted.
- Business constants and pure calculation functions belong in `src/app/core/` (e.g., `recipe.constants.ts`, `mass-balance.utils.ts`), not inside component classes.
- CSS scoped to a component must live in that component's `.css` file. Do not add component-specific rules to `app.component.css`.
- When extracting a component, verify that all subscriptions, observers, and timers are cleaned up in the new component's `ngOnDestroy`.

### When adding or changing features

1. Identify which existing component owns the area — extend it first.
2. If the change makes that component exceed ~80 template lines or mixes roles, split before shipping.
3. After any refactor, confirm the shared `recalc()` data flow still reaches all affected components (via `@Input` bindings or a shared service, not direct parent references).
4. Run `ng build` after any structural change to catch template type errors before marking the task done.
