# @seugi/design-tokens

Canonical TypeScript design foundations shared by Seugi clients. Color values match the existing Seugi web palette and Android design system; typography preserves the web `SeugiFont` scale.

```ts
import { SeugiColor, SeugiFont } from "@seugi/design-tokens";
```

Keep screen composition and component-specific layout in each app. This package only owns cross-client tokens; adding a token should not alter an existing screen unless that screen already used the corresponding original value.
