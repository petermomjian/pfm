---
name: shadcn-design-apply-brand
description: Apply a customer's brand to their shadcn/ui kit for Figma (shadcndesign.com) by creating a new brand mode in the kit's Style variable collection. Use when the user explicitly asks to apply, import, or set up their brand, product, or app styling in the kit, with a brand book PDF, screenshots, HTML/CSS, or nothing at all (then interview them). Do not fire for one-off color tweaks; this is a full theming ceremony.
---

# Apply branding to the shadcn/ui kit for Figma

Turn a brand into a new **mode** in the kit's `Style` variable collection: a 9th style sitting beside Nova…Lyra, so the whole kit (every component, block, and preview) restyles to the brand with one mode switch, and the customer keeps the stock styles untouched.

The brand decisions cover **colors (light + dark), radius, and fonts**. Everything else in the new mode inherits from the stock style it's duplicated from, but every value *derived from a changed color* gets recomputed (Step 5), because the kit bakes tints into literals: `custom/focus-ring` is ring @ 50%, `custom/destructive-muted` is destructive @ 10%. Change `ring` without recomputing and the focus ring keeps glowing in the old brand's color.

## Environment

- **Figma agent**: native variable editing.
- **Figma MCP** (Claude Code / Cursor): variables are read and written through `use_figma` Plugin API scripts (load the `figma-use` skill first, mandatory). Enumerate with `getLocalVariableCollectionsAsync` / `getLocalVariablesAsync`; write per-mode with `variable.setValueForMode(modeId, value)`; aliases are `{type: 'VARIABLE_ALIAS', id}` values. Keep scripts ≤ ~10 logical operations; failed scripts are atomic. Fix and retry. `get_variable_defs` shows display names, not real variable names. Never round-trip through it.

## Step 1: Preflight

Find the `Style` collection and list its modes. Expect the 8 stock modes (Nova, Vega, Mira, Luma, Sera, Maia, Rhea, Lyra); extra modes mean a brand already exists. Ask whether to update it or add another.

Adding a mode is plan-gated by Figma (Professional allows 10 per collection; Starter cannot add any). Attempt the mode creation only at Step 4; if it fails with a limit error, stop and tell the user their Figma plan can't hold another mode. Do not fall back to overwriting a stock mode without being asked.

## Step 2: Ingest the brand

- **Materials provided** (PDF, screenshots, HTML/CSS, a live site): extract concrete values: hex codes, font families, radius character, logo colors. Screenshots: read dominant surface, text, and accent colors from the pixels.
- **Nothing provided**: interview. Either way, the interview (next) fills what materials leave open; materials almost never answer all of it.

Interview until every slot below has an answer. Ask in batches, propose a concrete default with each question, and push back on vague answers ("modern and clean" is not a color):

1. **Primary** brand color, and what it's used for (buttons? links? both?).
2. **Neutrals**. Never invent gray values: the kit's Tailwind collection ships nine neutral ramps, and surfaces/borders/muted tokens take their values from exactly one of them. Cool: `slate`, `gray`, `zinc`; pure: `neutral`; warm: `stone`, `taupe`; tinted: `mist`, `mauve`, `olive`. From the brand's temperature, propose the 2–3 closest ramps (with sample steps) and have the user pick one; then derive every neutral token (`background`, `card`, `muted`, `border`, `input`, and their dark counterparts) from that ramp's actual steps, not from free-hand grays. One ramp keeps every surface hue-consistent, which is what makes a theme read as designed rather than assembled.
3. **Secondary / accent**: a real second color, or tints of primary?
4. **Destructive**: keep shadcn red or a brand-specific red?
5. **Radius character**: sharp (0), subtle (~6px), soft (~10px), round (14px+)?
6. **Fonts**: sans, heading (same or different?), mono. Check availability now (`listAvailableFontsAsync` on the MCP path), because brand fonts are usually NOT loadable in Figma (Helvetica Neue and even Georgia are commonly absent); propose the closest available family in the same breath, so the proposal never names a font the file can't render.
7. **Dark mode**. Always ask explicitly: does the brand have defined dark colors? If not, walk through the dark decisions with them: background (near-black neutral vs. tinted with brand hue), whether primary stays the same or lightens for contrast, and how surfaces (card/popover) step up from the background. Propose derived values (shadcn convention: keep hue and chroma, shift lightness) but get them confirmed. Never silently invent the dark palette.

## Step 3: Propose, then wait

Present one proposal and get explicit approval before touching the file:

- **Base style to duplicate**. The stock mode closest to the brand, chosen by: radius character first (Sera/Lyra for square brands), then typography feel, then palette temperature. Say which and why.
- **Token table**: the shadcn color tokens (`background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive` + their `-foreground` pairs, `border`, `input`, `ring`, `chart-1..5`, `sidebar-*`) with proposed light AND dark values, plus radius scale and font families. (In the kit, `destructive-foreground` lives under `custom/*`, not the base set; Step 5 carries it.)
- Check contrast as you assign: every `X` / `X-foreground` pair ≥ 4.5:1. Flag pairs that fail and propose the adjusted value.

Iterate on feedback. Only an explicit "yes, apply it" moves to Step 4.

## Step 4: Create the brand mode

1. Add a mode named after the brand to the `Style` collection. `addMode` seeds every variable with the collection's **default** mode's values (Nova), not your chosen base, which is why step 2 is not optional.
2. Copy **every** variable's value from the base style's mode into the new mode (aliases stay aliases: they resolve per-mode automatically; literals copy as-is). The new mode must start as a perfect clone: any variable left at the seeded default silently diverges from the base style. On the MCP path, chunk the copy at ~500–600 variables per script. The full collection in one script risks timeouts.
3. Apply the approved brand values in the new mode only: `color/light/*` and `color/dark/*` for every token in the table, `radius/xs..4xl` (derive the scale from the approved base radius the way the kit does: lg = base, sm = base−4, md = base−2, xl = base+4, then +8/+12/+16; floor at 0), `font/family/{sans,heading,mono}`, and `meta/style-name` to the brand name.
4. Touch only the new mode. A write into a stock mode's column corrupts the styles every other customer file references. If one happens, restore it from a fresh read of another kit copy before continuing.

## Step 5: Recompute derived values

The clone still carries the base style's colors inside derived literals. In the kit these live in exactly two namespaces: `color/{light,dark}/custom/*` and `color/{light,dark}/alpha/*` (`component/*` color values are aliases and resolve on their own; skip anything whose value is an alias). Recompute the literals in the new mode:

1. **Name hint first, RGB second.** Most derived values are NOT exact copies of a base token: they are near-misses (`#e5000b` tint beside an `#e7000b` base) or pulled from a neighboring ramp (`#dc2626` for destructive accents), so exact-RGB matching silently leaves old-brand tints behind. Derive the base from the variable's name (`custom/focus-ring` → `ring`, `custom/primary-muted`/`custom/primary-hover`/`custom/selected-wash` → `primary`, `custom/destructive-*` → `destructive`, `custom/muted-*` → `muted`), confirm with a tolerant RGB comparison (same hue family, within a few steps), and rewrite as the new base's RGB **with the same alpha** (destructive @ 10% stays 10%, in the new destructive).
2. **`alpha/*` follows the backgrounds**: light alphas are white-based, dark alphas are based on the dark background. If the brand's dark background changed (e.g. `#0a0a0a` → `#000000`), every dark `alpha/*` literal changes with it.
3. Neutral washes and overlays whose name hints at no base token (`custom/tinted`, `custom/menu-glass`, `custom/overlay`) are style furniture. Leave them, list them in the final report so the user can re-brand them manually if they care.

This is the step that fulfills "if input changes, input/30 changes too". Skip it and every tint, hover, and focus ring still wears the old brand.

## Step 6: Verify visually

1. Clone one `Style Preview` frame, set the new Style mode explicitly on the clone, and screenshot it. The kit's preview frames contain a Light and a Dark section internally (each with its own explicit Mode override), so one clone shows both. Setting the Mode collection on the clone root changes nothing.
2. Inspect the dark half as carefully as the light one: dark exposes missed derived values and unbound fills that light hides.
3. Look for the old brand's colors anywhere: a stray old-primary tint means Step 5 missed a literal; find and recompute it.
4. Show both screenshots to the user and iterate until they approve.

## Step 7: Hand off

The Plugin API cannot reorder modes, so the brand mode is not the collection default. Tell the user how to finish:

- To make it the default: Variables panel → drag the brand mode to the first position (the first mode is the file default).
- To use it meanwhile: select any page/frame → right panel mode switcher → Style → brand mode.

Close with a report: what was set (tokens, radius, fonts, dark), which derived values were recomputed, which literals were left un-branded, and any contrast compromises made.
