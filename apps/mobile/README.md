# Mobile client structure

`App.tsx` owns session hydration, authentication requests, workspace selection, and push-token registration. UI composition is split into screens under `src/screens/`, reusable controls and feature components under `src/components/`, and shared API/date/URL helpers under `src/`.

The screen modules are extractions of the existing Seugi client, not a redesign. Preserve the original screen order, Korean copy, spacing, colors, and interaction behavior when making further changes. `@seugi/design-tokens` is the shared source for canonical Seugi colors and typography; screen-specific layout stays local so token adoption cannot silently restyle a legacy screen.

Run `pnpm --filter @seugi/mobile check` for TypeScript validation and `pnpm --filter @seugi/mobile build` to export Android and iOS bundles.
