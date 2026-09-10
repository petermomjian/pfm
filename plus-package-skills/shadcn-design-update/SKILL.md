---
name: shadcn-design-update
description: Bring new components from a newer release of the shadcn/ui kit for Figma (shadcndesign.com) into a customer's existing kit file. Use when the user explicitly asks to update their kit, sync a new kit version, or add components from a new release; kit updates ship as new Figma files, so components must be rebuilt natively in the customer's file, not copy-pasted.
---

# Update a shadcn/ui kit for Figma from a new release

Kit updates arrive as **new files**. Copy-pasting components across files drags foreign variables and styles along, so instead you **rebuild** each new component natively in the customer's kit (the *target*), bound to the target's own variables, text styles, and nested components, indistinguishable from a component that shipped with their file.

Scope: **new components only**, component pages that exist in the source release but not in the target. Never modify or replace the target's existing component sets: customer design files hold instances of them.

## Inputs

1. **Source**: link to the user's **own copy** of the new kit release, the file they downloaded from the shadcndesign.com Customer Portal and added to their Figma account. A shadcndesign.com preview/demo link is not a valid source (it's not a file in their account); if the link looks like a public preview, tell the user to download the release from the Customer Portal first and link that copy.
2. **Target**: the customer's kit, the open file (Figma agent) or a second link (MCP).

Missing either one → ask before doing anything else.

## Environment

- **Figma agent**: works in the open target file; read the source via its link.
- **Figma MCP** (Claude Code / Cursor): load the `figma-use` skill before any `use_figma` write. Mandatory. Both files are addressed by file key from their URLs. Plugin API traps that break rebuilds:
  - `get_metadata` on a file root silently truncates the page list; enumerate pages via `figma.root.children`.
  - Scripts are atomic (a failure changes nothing; fix and retry); keep them ≤ ~10 logical operations, one page-switch per script, return every created node id.
  - New frames default to an opaque white fill; set `fills = []` on every structural wrapper (invisible on light, glaring in dark).
  - `setBoundVariableForPaint` returns a *new* paint; capture and reassign. Paint opacity IS preserved through binding (pass `opacity` on the paint you bind; the kit itself uses bound paints at 30% for checked borders).
  - Reassigning a bound fill several times within one script can leave the renderer painting the fallback color while the API reports the correct binding; screenshots betray it (fallback-black chips, "inverted" text). Heal by reassigning the fill once more in a separate script; trust the screenshot over the data model.
  - Add all component properties **before** `combineAsVariants`; set variant props together (`{Variant: "outline", Size: "sm"}`); a partial set can name a combination that doesn't exist and throws.
  - Instances are named after the component **set**, not the variant. Load every font (family + style) before any text mutation; apply text styles with `setTextStyleIdAsync`.
  - `resize()` before setting sizing modes; `HUG`/`FILL` are only valid after `appendChild` into an auto-layout parent.

## Step 1: Diff the releases

1. List both files' pages. Component pages sit after the `Default shadcn/ui components ↓` divider, one component per page; check the Pro Blocks and Utility Components pages too. Read `meta/version` in each file's Style collection to confirm source is actually newer.
2. New components = source component pages (and Pro Block sets) with no counterpart in the target. Match by name, tolerating the customer's renames; check a page's component set names before declaring it missing.
3. Present the list to the user and let them pick which to bring over. Also ask the scope per run: **full page parity** (component set + variant-grid documentation + docs frame with Playground, like an official page) or **component set only**. Wait for their choices.

## Step 2: Extract the source spec (read-only)

For each chosen component, from the source file:

- The component set(s): variant matrix (every `Variant`/`State`/`Size` combination and the grid positions), component property definitions (TEXT props like `Button Text`, BOOLEAN `Show <X>` props, INSTANCE_SWAP props) and which child layers reference them, layer structure and names, auto-layout values.
- Every bound variable **by name** (`component/<x>/bg`, `radius/lg`, `spacing/2`, Mode-collection color tokens) and every text style by name. Names are the bridge between files; never carry raw values or ids across. Three binding classes hide from a naive dump and each one you miss breaks restyling:
  - **Effect styles** (`node.effectStyleId` → e.g. `focus/default`, `shadow/component/control`): the kit's focus rings and control shadows are shared styles whose spread/offset bind per-style variables; recreating them as literal effects freezes one style's values. Read the style name and re-apply the target's style of the same name.
  - **Text-property bindings** (`boundVariables.fontSize/fontFamily/fontWeight/lineHeight`) are **array-valued**; a filter that skips arrays silently drops them. Kit text nodes bind these even when a text style is applied (e.g. a `label-size` override on top of `text-sm`).
  - **Soft-deleted variables**: a bound reference can point at a variable absent from `getLocalVariablesAsync` (deleted but still referenced). `getVariableByIdAsync` still reads it; recover its name and values that way, and recreate it as a live variable in the target.
- Nested component usage: IconPlaceholder, Button, Spinner, `_Docs / Header` / `_Docs / Footer`; note which and with what overrides.
- If full parity was chosen: the variant-grid wrappers (purple `#9747FF` dashed cells, labels) and the docs frame (header, Playground with Light/Dark examples and their per-instance prop overrides, footer): geometry and content.

Build child component sets before the sets that instance them.

## Step 3: Inventory the target and create missing variables

1. Map every variable name and text style name from the spec to the target's local ids. Nested components: find the target's own IconPlaceholder/Button/Spinner/docs components by name.
2. Variables the target lacks (typically a new `component/<name>/*` namespace) get created in the target's Style collection, with a value **per mode the target actually has**; match modes to the source by name, and modes the customer deleted simply don't get values (never re-add them):
   - Stock modes present in the target: copy the source's per-mode values; aliases are recreated as aliases to the target's variable of the same name.
   - Extra modes (the customer's brand mode): aliases resolve automatically; nothing to do. Literals with baked alpha are recomputed from the brand mode's own base tokens (destructive @ 10% uses the *brand's* destructive), mirroring the mode the brand was duplicated from. A literal you can't trace to a base token: copy from the brand's parent style and flag it in the report; never guess a brand value.
3. Missing text styles or fonts: create the text style from the source's definition; a font the target file can't load → stop and ask.

## Step 4: Rebuild in the target

1. Build one fully-wired master per structural branch: all layers named as in the source, auto-layout matching, every fill/stroke/radius/spacing bound to the *target's* variables, text styles applied, component properties defined and referenced.
2. Clone the master per variant and adjust what the variant changes. Name each `Prop=Value, Prop2=Value2`, then `combineAsVariants`, reposition to the source's grid, and match the source's default variant and set description.
3. Place the result on a new page named exactly like the source's page, positioned to match the source file's page order. Full parity scope: rebuild the Components section, variant grids, and docs frame too; copy the docs chrome conventions (radius, shadow, explicit Light/Dark modes) from one of the *target's* existing component pages, not from the source, so the page matches the customer's file.

## Step 5: Verify, identical or not done

"Identical" means identical **structure and bindings**, not identical pixels: the two files may not share a single Style mode (customers delete stock styles and keep only their brand), and then the same component legitimately *renders* differently in each file. Structure is the ground truth; pixels are only evidence where both files can render the same mode. Treat any difference as a defect:

1. **Structural parity: the primary check, valid regardless of which modes exist.** Diff the rebuilt component against the source spec from Step 2, name by name: layer tree and layer names; every variable binding on every property (fills, strokes, radii, spacings, per-side stroke weights, text fontSize/fontFamily/fontWeight, effect fields) bound to the *same-named* variable; text styles and effect styles applied by the same names; the full variant matrix, component property definitions, and which children reference which properties. `get_variable_defs` on both sets is the fast cross-check: the two name lists must mirror each other, with only intended differences (the target's own fonts/brand values).
2. **Screenshots, mode-matched.** Render source and rebuild in a Style mode **both files have** (match by `meta/style-name`) and compare every variant row; if it looks different in the same mode, it *is* different. No shared mode (brand-only kit): screenshot the rebuild in the customer's mode and inspect it alone for breakage: collapsed layout, invisible text, fallback-black fills, not for likeness to the source's render.
3. **Dark check**: view the rebuilt set with the Mode collection set to Dark; stray white fills and unbound colors only show here. Compare against the source's own dark render where a shared style mode exists; some kit components have dark quirks of their own, and matching the source's quirk is correct.
4. **Restyle check**: switch a rebuilt instance to a second Style mode (and the brand mode if present): a component that doesn't restyle has a hardcoded value; find and bind it. Only one mode in the target: this check is covered by structural parity (bindings by name), so skip it rather than inventing a mode.
5. Delete any parked/probe nodes left on the page.

Report: components added, variables created (and which brand-mode values were derived vs. copied-and-flagged), fonts/styles added, and every known deviation.
