# Token generation

`packages/tokens` turns a stored definition into colors, sizes and stylesheets. It is pure —
no I/O, no framework, no React — which is what lets the browser and the API both call it.

## Two consumers, one function

```
definition ──▶ resolveDesignSystem ──▶ emitFromResolved ──▶ { files: [{ path, contents }] }
                                                              │
                              editor preview tabs ◀────────────┴────────▶ API zip stream
```

The editor renders `files` as tabs; the API streams the same array into a zip. Neither holds a
copy of the emit logic, so a download cannot drift from what the user was shown. Anything that
would make the two differ — a server-only header, a preview-only shortcut — belongs somewhere
else.

`resolveDesignSystem` is synchronous and cheap enough to run on every keystroke, so the editor
holds no cache and the API holds no cache.

## Color scales

A palette is a base color plus two modifiers, expanded into eleven steps (50–950).

**Lightness is fixed per step, not derived from the base color.** Step 500 has the same
perceptual lightness in every palette of every system. That predictability is what makes the
semantic layer safe: repointing `primary` from `brand-600` to `danger-600` cannot silently
change a contrast ratio. The cost is that a user's exact base color is snapped to its nearest
step rather than reproduced verbatim — deliberate, and the main thing to understand before
changing `RAMP`.

**Chroma is anchored.** The curve peaks around 600–700 and falls off at both ends, because
near-white and near-black cannot hold much chroma inside sRGB. It is scaled so that the step
closest to the base color in lightness matches the base color's chroma exactly. A muted base
gives a muted ramp and a vivid base a vivid one, with no separate intensity control.

**Hue rotates across the ramp.** `hueShift` is applied as −shift at the lightest step and
+shift at the darkest. Real palettes are not one hue at eleven lightnesses; shadows drifting
cool while tints drift warm is what stops a ramp looking like a single color at different
opacities.

Every step is gamut-mapped into sRGB by reducing chroma. Rounding happens _before_ clamping for
lightness and hue, and chroma is floored afterwards, so the 4-decimal truncation can only move
a color further inside the gamut — rounding after clamping pushes edge colors back out.

Contrast uses WCAG 2.1 relative luminance. `analyzeContrast` scores the surface/on-surface
pairs listed in `CONTRAST_PAIRS`; tokens without a partner are not scored.

## Type scale

Geometric: `size = base × ratio^offset`, with the named steps' offsets in `TEXT_STEPS`. Line
height and letter spacing are derived from the resulting size rather than configured per step —
large text needs proportionally less leading and slightly negative tracking, small text the
opposite. Both curves are centred so text at exactly the base size gets neutral tracking
whatever base the user picked.

A pure geometric scale compounds hard at the extremes, which is why the default ratio is 1.2
rather than 1.25: the same base gives an 11px `xs` instead of 10.2px, and a 48px `5xl` instead
of 61px.

## Emitted files

Two setups, and they are **alternatives, not layers**:

- `theme.css` — a self-contained Tailwind v4 entry point.
- `tokens.css` + `semantic.css` — the same tokens as plain custom properties.

Both define the same variable names, so a component written against `var(--color-background)`
works under either. That equivalence is worth preserving; it is asserted in the emit tests.

In the Tailwind output, primitives go in `@theme static` — `static` because Tailwind otherwise
drops theme values no utility references, and the semantic layer reaches them only through
`var()`. Semantic colors go in `@theme inline` pointing at a separate `--semantic-*` layer;
`inline` keeps utilities referencing the variable instead of copying its value, which is what
makes runtime theme switching work at all.

Dark mode is a class or data attribute (`@custom-variant dark`), not `prefers-color-scheme`, so
the consuming app decides when it applies. The generated README carries the snippet for
following the OS preference.

## Preview

The editor does not inject a stylesheet. `previewVariables` renders the resolved system as
inline custom properties on the preview subtree, which scopes them completely — they cannot
leak into the app's own chrome — and lets the light and dark previews sit side by side, which a
`:root` stylesheet could not do. The names match the emitted files exactly, so preview markup
and exported markup are interchangeable.

## Testing

The emit tests assert that every `var()` reference resolves to a declaration in the same file.
A dangling custom property fails silently in a browser, so this is the check that matters most.
Snapshots pin the token vocabulary — consumers depend on those names, and a rename should be a
visible diff rather than a quiet break.
