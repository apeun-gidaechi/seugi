# Web design system

Screen composition and route-level coordination stay in `Pages/`. Reusable feature UI stays in `Components/`, behavior in `Hooks/`, and transport in `Api/`. Cross-feature visual primitives live in `Components/ui`; they should not fetch data or own route state.

## Foundations

`tokens.ts` provides semantic aliases and shared spacing/radius/shadow values grounded in `@seugi/design-tokens`. The package is the canonical source for the original Seugi color and typography values used by the web and mobile apps. It is not a replacement palette: existing screens remain the visual source of truth. Prefer these aliases in new styled components and preserve computed styles when extracting existing ones.

## Components

- `Button`'s `seugi` variant backs the legacy button wrapper with the original Seugi dimensions, typography, and full-width behavior. The wrapper forwards native button props.
- `SeugiTextControl` backs the legacy text-field wrapper with its original dimensions and typography. The wrapper forwards native input props.
- `Avatar` centralizes the existing 60/36/32px circular profile image presentation. The legacy avatar wrapper retains its profile-loading behavior.
- `Button`'s `primary`, `secondary`, and `quiet` variants, the labeled `TextField`, `Surface`, and `Eyebrow` are available for new compositions, not substituted into existing screens by default.

Existing screen structure, styles, and visual behavior are the source of truth. When extracting or migrating a screen, preserve its rendered CSS and composition; adopt shared primitives only after confirming they reproduce the original presentation without visible changes.
