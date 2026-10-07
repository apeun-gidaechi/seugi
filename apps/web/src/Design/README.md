# Web design system

The web app keeps screen composition in `Pages/` and feature behavior in the existing hooks and `Api/` adapters. Reusable visual primitives live in `Components/ui`; they should not fetch data or own route state.

## Foundations

`tokens.ts` is the shared source for the refreshed web palette, spacing, radii, shadows, typography, and the mobile breakpoint. Prefer these tokens in new styled components rather than adding one-off hex values or spacing scales. `SeugiColor` and `SeugiFont` remain available to legacy screens during incremental migration.

## Components

- `Button`: primary, secondary, and quiet actions; supports full-width layouts and native button attributes.
- `TextField`: labeled, controlled input with helper/error text and an optional trailing control.
- `TextControl`: bare input primitive for legacy forms that already provide their own labels and containers.
- `Surface` and `Eyebrow`: shared building blocks for cards and section labels.

These foundations are intentionally not wired into existing screen compositions yet. Current screens retain their original Seugi structure, styles, and visual behavior; adopt shared primitives only when they can reproduce that presentation without visible changes.
