# AutoCalc UI Specification (Current Implementation)

Last updated: 2026-03-03
Scope: DOM/CSS behavior in `index.html`, plus runtime render behavior in `src/ui/` and `src_v2/ui/`.

## 1. Layout Model

The current UI is not a single fixed calculator body. It is a multi-surface shell composed of:

- Allocator device.
- Grapher device.
- Calculator device.
- Storage drawer.
- Unlock checklist panel.

In v1 shell mode these surfaces are arranged in a row-plus-sidebar layout.
In v2 shell mode (default), these surfaces are reorganized into a vertical, touch-friendly stack with drawer-style navigation.

## 2. Calculator Device

The calculator section includes:

- Paper roll (`data-roll`), anchored above the calculator body and expanded by line count.
- Primary total display (`data-total`) with segmented integer rendering and fraction/NaN fallback rendering.
- Secondary slot display (`data-slot`) showing operation pipeline tokens.
- Keypad grid container (`data-keys`).

The roll is hidden when empty and expands based on the runtime `--roll-line-count` CSS variable.

## 3. Keypad Model

The keypad is data-driven and dynamic:

- Runtime dimensions: `keypadColumns` x `keypadRows`.
- Supported range: `1..8` for each dimension.
- Grid template is set at render time from state.
- Cell content is determined by `ui.keyLayout` (key cell or placeholder cell).

There is no fixed 5x4 canonical keypad in current runtime.
There are no hardcoded double-width/double-height keys in current runtime.

## 4. Storage Drawer

The storage drawer is a separate surface from keypad:

- Container: `data-storage-keys`.
- Base columns: 8.
- Renders unlocked key cells and empty placeholders.
- Visibility is unlock-gated (`unlocks.uiUnlocks.storageVisible`).

Keys can move between keypad and storage by drag/drop interactions.

## 5. Interaction Behavior

### Mouse/Pointer

- All rendered keys have press visual feedback.
- Unlocked keys are interactive buttons.
- Drag/drop is supported across keypad and storage surfaces.
- Valid/invalid drop targets receive explicit visual states.

### Touch (v2 shell)

- Touch rearrangement behavior is handled by the v2 shell controller.
- Drawers and shell sections use touch gestures and snap logic.
- Touch action constraints prevent accidental browser gesture conflicts.

## 6. Visual Grouping and Styling

Key visuals are grouped by semantic role:

- value expression
- slot operator
- utility
- execution

The current style language is skeuomorphic device hardware (body gradients, inset displays, raised keys, paper roll texture) applied across multiple devices.

## 7. Responsiveness

- Device widths use clamp-based sizing and viewport-relative rules.
- Mobile breakpoint (`max-width: 639px`) collapses v1 shell columns to single-column flow.
- v2 shell uses bounded viewport height with internal track scrolling/translation behavior.
- Minimum key row height is preserved at 48px.

## 8. Runtime Keys In UI

Current key universe displayed through keypad/storage surfaces:

- Digits: `0..9`
- Value modifier: `NEG`
- Slot operators: `+`, `-`, `*`, `/`, `#`, `\u27E1`
- Utilities: `C`, `CE`, `UNDO`, `GRAPH`, `\u23EF`
- Execution: `=`, `++`

Keys may exist in storage, keypad, or be hidden by unlock state.

## 9. Non-Goals Of This Spec

This file documents current rendered behavior only. It does not define future visual targets, legacy fixed-grid prototypes, or unreleased key layouts.