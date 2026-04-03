# Gunpla Manager Optimization Plan

## Goals

This plan is the working roadmap for the next round of improvements.

Primary goals:

1. Restore reliability for the core user flows.
2. Remove the current encoding and text corruption problems.
3. Reduce coupling in the state and persistence layers.
4. Improve desktop UX and visual consistency across the app.
5. Leave the project in a shape that is easier to iterate on safely.

## Current Findings

### P0: Must fix first

- Text encoding is corrupted in multiple source files, and the damage is no longer only cosmetic.
  - Symptoms: mojibake in labels, placeholders, prompts, alerts, and comments.
  - Risk: product copy is unreadable, maintenance is hard, and future edits are error-prone.
- Core form flows are duplicated between `AddGunplaModal` and `EditGunplaPage`.
  - Result: behavior can drift, fixes must be made twice, and UX is inconsistent.
- `GunplaContext` is too large and mixes unrelated responsibilities.
  - It currently owns persistence, filtering, config tree management, import/export, theme state, cover library state, modal state, and mutations.
  - Result: changes are high-risk and debugging is slow.
- Electron-only capabilities rely on runtime checks but the UX is weak when unavailable.
  - Buttons and flows often degrade to `alert`-based failures instead of clear disabled states or scoped messaging.

### P1: Should fix in the first optimization wave

- UI copy and interaction patterns are inconsistent across pages and modals.
- The current visual system is serviceable but fragmented.
  - Different components feel like they were built at different times.
  - Form sections, action areas, density controls, and modal headers are not standardized.
- Cover library and manual library have useful functionality, but the interaction cost is high.
  - Too many ad hoc prompt/confirm interactions.
  - Selection and batch actions are not visually prominent enough.
- Build output is large.
  - Current production bundle includes a large main chunk and `pdf.worker` is very heavy.
  - This is not blocking today, but it will hurt startup and future growth.

### P2: Follow-up improvements

- Logging and error surfaces can be made more actionable.
- Tests and automated validation are still thin for the highest-risk flows.
- Some business rules are implied in UI code instead of being centralized.

## Evidence Collected

- `cmd /c npm run build`
  - Build passes.
  - Vite warns about a large chunk after minification.
- `cmd /c npm run lint`
  - Fails on one current issue:
    - unused `buildStatusConfig` in `src/components/AddGunplaModal.jsx`
- Source review confirms visible encoding corruption in:
  - `src/components/AddGunplaModal.jsx`
  - `src/components/EditGunplaPage.jsx`
  - `src/components/Header.jsx`
  - `src/components/Sidebar.jsx`
  - `src/components/MainContent.jsx`
  - `src/components/TypeManagementModal.jsx`
  - `src/components/CoverLibraryModal.jsx`
  - `src/components/ManualLibraryModal.jsx`
  - `src/context/GunplaContext.jsx`
  - `src/services/releasePriceLookup.js`
  - `src/services/communityApi.js`
  - `electron/main.js`
  - `README.md`

## Execution Plan

### Phase 1: Stabilize the product

Goals:

- Make core flows readable and dependable again.
- Eliminate the most harmful corruption and UX failure points.

Tasks:

1. Normalize file encoding to UTF-8 across the actively used source files.
2. Restore all user-facing Chinese copy in core views and services.
3. Fix lint errors and remove obviously dead or duplicated code paths.
4. Improve Electron capability gating.
   - Disable unsupported actions in web mode.
   - Replace generic `alert` failures with clearer inline or scoped feedback where feasible.
5. Re-test these flows manually:
   - add model
   - edit model
   - filter model list
   - import/export data
   - cover library import/select/delete
   - manual library scan/preview

Definition of done:

- No mojibake in the main user paths.
- Core flows are readable and usable.
- `npm run lint` passes.

### Phase 2: Refactor the code structure

Goals:

- Make the app easier to change without regressions.
- Reduce hidden coupling.

Tasks:

1. Split `GunplaContext` into smaller modules/hooks.
   - app data hydration and persistence
   - filtering and derived selectors
   - config tree operations
   - cover library operations
   - modal and page UI state
2. Centralize data normalization and defaults.
   - one source of truth for Gunpla item shape
   - one source of truth for persisted app data shape
3. Extract shared form logic from add/edit flows.
   - form state
   - validation
   - image upload helpers
   - lookup actions
4. Reduce prompt/confirm-driven business logic inside components.

Definition of done:

- The add and edit experiences share one form foundation.
- `GunplaContext` is notably smaller and easier to scan.
- Data shape logic is centralized.

### Phase 3: UI system upgrade

Goals:

- Make the product feel intentional, modern, and cohesive.
- Improve clarity on desktop without losing density.

Design direction:

- Keep the current dark desktop feel, but make it cleaner and more structured.
- Move from ad hoc zinc/blue styling to a defined token set.
- Use a clearer information hierarchy and more confident surfaces.

Tasks:

1. Define a UI foundation.
   - color tokens
   - spacing scale
   - radius scale
   - input/button/card/modal styles
   - typography scale
2. Upgrade key screens in this order:
   - Header
   - Sidebar
   - MainContent and card list
   - Add/Edit model form
   - Cover library modal
   - Type management modal
   - Manual library modal
3. Improve interaction details.
   - empty states
   - disabled states
   - error states
   - loading feedback
   - batch action affordances

Definition of done:

- The main screens look like one product.
- Primary actions are easier to find.
- Complex modals are more readable and lower-friction.

### Phase 4: Performance and verification

Goals:

- Prevent the cleanup work from regressing.
- Improve shipping confidence.

Tasks:

1. Re-run build and lint after each major batch.
2. Add lightweight validation around the most fragile logic.
3. Evaluate code-splitting opportunities for heavy features.
   - PDF preview
   - large modal surfaces
4. Document residual risks and next-step ideas.

## Proposed Work Order

1. Fix encoding and text corruption in core files.
2. Clean up add/edit form logic and make those flows share structure.
3. Improve Electron capability gating and feedback.
4. Break down `GunplaContext`.
5. Apply the new UI foundation to primary screens.
6. Optimize secondary modals and heavier flows.
7. Re-run verification and package review.

## Immediate Next Batch

This is the recommended first implementation batch:

1. Repair text and labels in `AddGunplaModal`, `EditGunplaPage`, `Header`, `Sidebar`, and `MainContent`.
2. Remove the current lint failure.
3. Introduce a shared model form section or form config to stop add/edit drift.
4. Make desktop-only actions visibly unavailable outside Electron.
5. Verify build, lint, and the main create/edit/filter flows.
