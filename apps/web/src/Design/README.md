# Web design system

The web app keeps screen composition in `Pages/` and feature behavior in the existing hooks and `Api/` adapters. Reusable visual primitives live in `Components/ui`; they should not fetch data or own route state.

## Foundations

`tokens.ts` provides semantic aliases and shared spacing/radius/shadow values grounded in `@seugi/design-tokens`. The package is the canonical source for the original Seugi color and typography values used by the web and mobile apps. It is not a replacement palette: existing screens remain the visual source of truth. Prefer these aliases in new styled components and preserve computed styles when extracting existing ones.

## Components

- `Button`: primary, secondary, and quiet actions; supports full-width layouts and native button attributes.
- `Button`'s `seugi` variant backs the legacy button wrapper with the original Seugi dimensions and typography.
- `TextField`: labeled, controlled input with helper/error text and an optional trailing control.
- `TextControl`: input primitive used by the composed, labeled field.
- `SeugiTextControl`: compatibility primitive for existing forms; preserves the original Seugi input dimensions and typography.
- `Surface` and `Eyebrow`: shared building blocks for cards and section labels.

These foundations are intentionally not wired into existing screen compositions yet. Current screens retain their original Seugi structure, styles, and visual behavior; adopt shared primitives only when they can reproduce that presentation without visible changes.
