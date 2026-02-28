# AutoCalc

AutoCalc is a calculator-first progression game. The calculator itself is the ruleset: unlocked keys define what actions are possible, `=` executes operation slots left-to-right, and progression is earned by satisfying behavior-based unlock conditions.

## Project Structure

- `src/`: current v1 runtime (domain, UI, persistence, app bootstrap)
- `tests/`: TypeScript test suite
- `design_refs/`: high-level design, UI spec, and implementation contract
- `dist/`: compiled JavaScript output from TypeScript builds

## Build

```bash
npm install
npm run build
```

## Play (Local)

```bash
npm run build
npm run dev:serve
```

Then open: `http://localhost:4173/index.html`

## Test

```bash
npm test
```
