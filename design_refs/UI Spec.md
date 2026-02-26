# Calculator UI - Physical Layout Specification (Completed Form)

## 0. Scope For This Pass

This document describes the completed visual layout of the calculator shell.
For the current implementation pass:
- Only already-implemented game keys are interactive.
- Unsupported keys keep their grid positions as blank placeholders.
- No new game mechanics are introduced.

---

## 1. Overall Form

The interface represents a single, self-contained calculator device centered within the viewport.

The calculator body:
- Is a rounded rectangular slab.
- Has subtle depth (soft shadow or bevel) to feel like a physical object.
- Maintains a fixed aspect ratio and scales responsively to fit the device.
- Has a defined maximum width for large screens and a defined minimum key size for usability on small screens.

All internal components scale proportionally with the calculator body.

---

## 2. Paper Roll

### Position
- A paper roll emerges from a horizontal slot at the top of the calculator body.
- The roll extends upward behind the calculator.
- The most recent entry appears closest to the slot.

### Behavior
- The roll area is vertically scrollable if content exceeds available space.
- On taller screens, more of the roll is visible.
- On shorter screens, the visible roll area compresses before any buttons shrink below usability.

### Appearance
- Off-white paper texture.
- Monospace print-style font.
- Each entry is a single-line row.
- Slight drop shadow to imply separation from the background.

---

## 3. Display Area

The display section spans the full width of the calculator body and sits directly below the roll slot.

### 3.1 Total Display (Primary)

- Full-width inset display window.
- 7-segment numeric style.
- Fixed digit positions (monospaced alignment).
- Displays the current total.
- Visual style:
  - Dark background.
  - Illuminated segments for active digits.
  - Faint, unlit segments subtly visible for realism.

### 3.2 Function Display (Secondary)

- Full-width, shorter display beneath the total display.
- Dot-matrix / pixel display style.
- Displays the currently defined function pipeline.
- Single-line horizontal layout.
- If content exceeds width, it scrolls horizontally within the display region.
- Slightly darker or more recessed than the total display to indicate secondary status.

---

## 4. Button Grid

### Grid Structure

- 5 rows x 4 columns base grid.
- Uniform grid spacing.
- Grid width matches the display width above.
- Consistent padding between grid and calculator edges.

### Key Geometry

Buttons are rectangular with slightly rounded corners and subtle elevation.

Two keys deviate from uniform size:

- **Zero (`0`)**
  - Occupies two columns in the bottom row.
  - Width: 2x standard key width.
  - Height: standard key height.

- **Equals (`=`)**
  - Occupies the bottom two cells of the rightmost column.
  - Height: 2x standard key height.
  - Width: standard key width.

All other keys occupy one grid cell.

### Button Layout

Row 1: [C] [CE] [x] [/]
Row 2: [7] [8] [9] [-]
Row 3: [4] [5] [6] [+]
Row 4: [1] [2] [3] [=]
Row 5: [ 0   ] [.] [=]

The rightmost column forms a vertical operator rail:
- /
- -
- +
- = (double-height)

The digit cluster occupies the left 3 columns in a standard calculator layout.

For the current implementation pass, any unsupported key above is rendered as a blank placeholder cell.

---

## 5. Interaction Feedback (Visual Only)

All keys:
- Have a visible pressed state (depressed effect).
- Return to neutral state on release.
- Include subtle hover feedback (for pointer devices).

The equals key is visually emphasized through increased vertical size.

---

## 6. Responsiveness Rules

- The calculator scales uniformly to fit available width.
- Minimum tappable key size is preserved.
- The roll area compresses before key size is reduced below usability.
- Aspect ratio remains stable across device sizes.
- Layout does not reflow into alternative configurations.

### Starter Measurements (Recommended)
- Calculator max width: 420px
- Calculator min width: 300px
- Internal body padding: 16px
- Grid gap: 10px
- Minimum key height: 48px
- Body corner radius: 22px

### Starter Breakpoints (Recommended)
- Desktop: 1024px and up
  - Use max calculator width (up to 420px)
  - Paper roll visible height: 180px
- Tablet: 640px to 1023px
  - Calculator width: 360px to 400px
  - Paper roll visible height: 140px
- Mobile: up to 639px
  - Calculator width: min(92vw, 360px), not below 300px
  - Paper roll visible height: 96px
  - Keep key height >= 48px

---

## 7. Visual Hierarchy

Priority order from strongest to weakest visual emphasis:

1. Total display
2. Button grid
3. Function display
4. Paper roll

The total display is the primary focal point.
The function display is visually secondary.
The roll is present but does not compete for attention.

---

## 8. Style Cohesion

The design should clearly read as a literal calculator:
- Inset display windows
- Raised physical keys
- Subtle material shading
- Mechanical plausibility (paper roll slot, printed entries)

The device should feel grounded and rule-bound.
