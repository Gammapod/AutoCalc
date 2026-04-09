import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeSlots, executeSlotsValue } from "../src/domain/engine.js";
import { calculatorValuesEquivalent, toComplexCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import { ALG_CONSTANTS, addAlgebraic } from "../src/domain/algebraicScalar.js";
import type { RationalValue } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): RationalValue => ({ num, den });

export const runEngineTests = (): void => {
  assert.deepEqual(executeSlots(r(42n), []), { ok: true, total: r(42n) }, "identity behavior when no slots exist");

  const result = executeSlots(r(10n), [{ operator: op("op_add"), operand: 5n }]);
  assert.deepEqual(result, { ok: true, total: r(15n) }, "single plus slot executes");

  const subtractionResult = executeSlots(r(10n), [{ operator: op("op_sub"), operand: 3n }]);
  assert.deepEqual(subtractionResult, { ok: true, total: r(7n) }, "single minus slot executes");

  const multiplicationResult = executeSlots(r(10n), [{ operator: op("op_mul"), operand: 3n }]);
  assert.deepEqual(multiplicationResult, { ok: true, total: r(30n) }, "single multiply slot executes");

  const divisionResult = executeSlots(r(10n), [{ operator: op("op_div"), operand: 4n }]);
  assert.deepEqual(divisionResult, { ok: true, total: r(5n, 2n) }, "single division slot returns reduced fraction");

  const mixedResult = executeSlots(r(10n), [
    { operator: op("op_add"), operand: 2n },
    { operator: op("op_div"), operand: 4n },
  ]);
  assert.deepEqual(mixedResult, { ok: true, total: r(3n) }, "slots execute left-to-right with division support");

  const divByZero = executeSlots(r(10n), [{ operator: op("op_div"), operand: 0n }]);
  assert.deepEqual(divByZero, { ok: false, reason: "division_by_zero" }, "division by zero returns explicit failure");

  const euclidResult = executeSlots(r(10n), [{ operator: op("op_euclid_div"), operand: 4n }]);
  assert.deepEqual(
    euclidResult,
    { ok: true, total: r(2n), euclidRemainder: r(2n) },
    "euclidean division returns integer quotient and remainder",
  );

  const euclidNegative = executeSlots(r(-10n), [{ operator: op("op_euclid_div"), operand: 4n }]);
  assert.deepEqual(
    euclidNegative,
    { ok: true, total: r(-3n), euclidRemainder: r(2n) },
    "euclidean division on negative totals uses floor quotient with non-negative remainder",
  );

  const euclidFromFraction = executeSlots(r(5n, 2n), [{ operator: op("op_euclid_div"), operand: 2n }]);
  assert.deepEqual(
    euclidFromFraction,
    { ok: true, total: r(1n), euclidRemainder: r(1n, 2n) },
    "euclidean division on fractional totals preserves fractional remainder",
  );

  const mixedEuclid = executeSlots(r(20n), [
    { operator: op("op_euclid_div"), operand: 6n },
    { operator: op("op_add"), operand: 1n },
    { operator: op("op_euclid_div"), operand: 2n },
  ]);
  assert.deepEqual(
    mixedEuclid,
    { ok: true, total: r(2n), euclidRemainder: r(0n) },
    "mixed pipeline reports the final euclidean remainder",
  );

  const euclidNotFinal = executeSlots(r(20n), [
    { operator: op("op_euclid_div"), operand: 6n },
    { operator: op("op_add"), operand: 1n },
  ]);
  assert.deepEqual(
    euclidNotFinal,
    { ok: true, total: r(4n) },
    "remainder metadata is omitted when the final operation is not euclidean division or modulo",
  );

  const moduloResult = executeSlots(r(10n), [{ operator: op("op_mod"), operand: 4n }]);
  assert.deepEqual(
    moduloResult,
    { ok: true, total: r(2n), euclidRemainder: r(2n) },
    "modulo operator stores euclidean remainder as total and exposes remainder metadata",
  );

  const moduloFraction = executeSlots(r(5n, 2n), [{ operator: op("op_mod"), operand: 2n }]);
  assert.deepEqual(
    moduloFraction,
    { ok: true, total: r(1n, 2n), euclidRemainder: r(1n, 2n) },
    "modulo operator supports fractional totals and preserves exact remainder metadata",
  );

  const maxOnInteger = executeSlots(r(10n), [{ operator: op("op_max"), operand: 12n }]);
  assert.deepEqual(maxOnInteger, { ok: true, total: r(12n) }, "max returns larger value");

  const minOnInteger = executeSlots(r(10n), [{ operator: op("op_min"), operand: 12n }]);
  assert.deepEqual(minOnInteger, { ok: true, total: r(10n) }, "min returns smaller value");

  const maxOnRational = executeSlots(r(5n, 2n), [{ operator: op("op_max"), operand: 2n }]);
  assert.deepEqual(maxOnRational, { ok: true, total: r(5n, 2n) }, "max supports exact rational-vs-integer comparison");

  const minOnRational = executeSlots(r(5n, 2n), [{ operator: op("op_min"), operand: 3n }]);
  assert.deepEqual(minOnRational, { ok: true, total: r(5n, 2n) }, "min supports exact rational-vs-integer comparison");

  const unaryNotZero = executeSlots(r(0n), [{ kind: "unary", operator: uop("unary_not") }]);
  assert.deepEqual(unaryNotZero, { ok: false, reason: "nan_input" }, "not maps numeric zero to NaN");

  const unaryNotNegative = executeSlots(r(-12n), [{ kind: "unary", operator: uop("unary_not") }]);
  assert.deepEqual(unaryNotNegative, { ok: false, reason: "nan_input" }, "not maps negative values to NaN");

  const unaryNotPositive = executeSlots(r(12n), [{ kind: "unary", operator: uop("unary_not") }]);
  assert.deepEqual(unaryNotPositive, { ok: false, reason: "nan_input" }, "not maps positive values to NaN");

  const unaryCollatzEven = executeSlots(r(8n), [{ kind: "unary", operator: uop("unary_collatz") }]);
  assert.deepEqual(unaryCollatzEven, { ok: true, total: r(4n) }, "collatz halves even integers");

  const unaryCollatzOdd = executeSlots(r(7n), [{ kind: "unary", operator: uop("unary_collatz") }]);
  assert.deepEqual(unaryCollatzOdd, { ok: true, total: r(22n) }, "collatz applies 3n+1 for odd integers");

  const unarySortAsc = executeSlots(r(-3102n), [{ kind: "unary", operator: uop("unary_sort_asc") }]);
  assert.deepEqual(unarySortAsc, { ok: true, total: r(-123n) }, "sort-asc reorders magnitude digits and preserves sign");

  const unaryMirror = executeSlots(r(-12030n), [{ kind: "unary", operator: uop("unary_mirror_digits") }]);
  assert.deepEqual(unaryMirror, { ok: true, total: r(-3021n) }, "mirror reverses magnitude digits and preserves sign");

  const unaryFloor = executeSlots(r(7n, 3n), [{ kind: "unary", operator: uop("unary_floor") }]);
  assert.deepEqual(unaryFloor, { ok: true, total: r(2n) }, "floor maps positive rational to integer floor");

  const unaryFloorNegative = executeSlots(r(-7n, 3n), [{ kind: "unary", operator: uop("unary_floor") }]);
  assert.deepEqual(unaryFloorNegative, { ok: true, total: r(-3n) }, "floor maps negative rational to integer floor");

  const unaryCeil = executeSlots(r(7n, 3n), [{ kind: "unary", operator: uop("unary_ceil") }]);
  assert.deepEqual(unaryCeil, { ok: true, total: r(3n) }, "ceiling maps positive rational to integer ceiling");

  const unaryCeilNegative = executeSlots(r(-7n, 3n), [{ kind: "unary", operator: uop("unary_ceil") }]);
  assert.deepEqual(unaryCeilNegative, { ok: true, total: r(-2n) }, "ceiling maps negative rational to integer ceiling");

  const collatzNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_collatz") }]);
  assert.deepEqual(collatzNanInput, { ok: false, reason: "nan_input" }, "collatz rejects non-integer totals");

  const sortNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_sort_asc") }]);
  assert.deepEqual(sortNanInput, { ok: false, reason: "nan_input" }, "sort-asc rejects non-integer totals");

  const mirrorNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_mirror_digits") }]);
  assert.deepEqual(mirrorNanInput, { ok: false, reason: "nan_input" }, "mirror rejects non-integer totals");

  const notNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_not") }]);
  assert.deepEqual(notNanInput, { ok: false, reason: "nan_input" }, "not rejects non-integer totals");

  const unaryI = executeSlotsValue(
    toRationalCalculatorValue({ num: 34n, den: 1n }),
    [{ kind: "unary", operator: uop("unary_i") }],
  );
  assert.equal(unaryI.ok, true, "unary-i executes on rational totals");
  assert.deepEqual(
    unaryI.ok ? unaryI.total : null,
    {
      kind: "complex",
      value: {
        re: { kind: "rational", value: { num: 0n, den: 1n } },
        im: { kind: "rational", value: { num: 34n, den: 1n } },
      },
    },
    "unary-i converts real totals to pure imaginary complex totals",
  );

  const unaryITwice = executeSlotsValue(
    toRationalCalculatorValue({ num: 34n, den: 1n }),
    [{ kind: "unary", operator: uop("unary_i") }, { kind: "unary", operator: uop("unary_i") }],
  );
  assert.deepEqual(
    unaryITwice,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: -34n, den: 1n }),
          im: toRationalScalarValue({ num: 0n, den: 1n }),
        },
      },
    },
    "unary-i applied twice collapses back to pure real negative total",
  );

  const unaryRotate15 = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    [{ kind: "unary", operator: uop("unary_rotate_15") }],
  );
  assert.equal(unaryRotate15.ok, true, "15-degree unary rotation executes on rational totals");
  const rotate15Expected = toComplexCalculatorValue(
    { kind: "alg", value: ALG_CONSTANTS.rotate15Cos },
    { kind: "alg", value: ALG_CONSTANTS.rotate15Sin },
  );
  assert.equal(
    calculatorValuesEquivalent(unaryRotate15.ok ? unaryRotate15.total : toNanCalculatorValue(), rotate15Expected),
    true,
    "15-degree unary rotation maps 1 to exact algebraic cos/sin components",
  );

  const rotate15TwentyFour = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    Array.from({ length: 24 }, () => ({ kind: "unary", operator: uop("unary_rotate_15") })),
  );
  assert.equal(
    calculatorValuesEquivalent(
      rotate15TwentyFour.ok ? rotate15TwentyFour.total : toNanCalculatorValue(),
      toRationalCalculatorValue({ num: 1n, den: 1n }),
    ),
    true,
    "24 successive 15-degree rotations return exactly to 1",
  );

  const shiftedSeed = toComplexCalculatorValue(
    { kind: "alg", value: addAlgebraic(ALG_CONSTANTS.one, ALG_CONSTANTS.rotate15Cos) },
    { kind: "alg", value: ALG_CONSTANTS.rotate15Sin },
  );
  const rotateShiftedTwentyFour = executeSlotsValue(
    shiftedSeed,
    Array.from({ length: 24 }, () => ({ kind: "unary", operator: uop("unary_rotate_15") })),
  );
  assert.equal(
    calculatorValuesEquivalent(
      rotateShiftedTwentyFour.ok ? rotateShiftedTwentyFour.total : toNanCalculatorValue(),
      shiftedSeed,
    ),
    true,
    "24 successive 15-degree rotations return complex shifted seed exactly",
  );

  const complexUnaryNot = executeSlotsValue(
    toRationalCalculatorValue({ num: 34n, den: 1n }),
    [{ kind: "unary", operator: uop("unary_i") }, { kind: "unary", operator: uop("unary_not") }],
  );
  assert.deepEqual(complexUnaryNot, { ok: true, total: toNanCalculatorValue() }, "unary-not maps complex totals to NaN");

  const unaryNotFromNan = executeSlotsValue(
    toNanCalculatorValue(),
    [{ kind: "unary", operator: uop("unary_not") }],
  );
  assert.deepEqual(unaryNotFromNan, { ok: true, total: toRationalCalculatorValue({ num: 1n, den: 1n }) }, "unary-not maps NaN input to one");

  const gaussianInput = {
    kind: "complex" as const,
    value: {
      re: toRationalScalarValue({ num: 3n, den: 1n }),
      im: toRationalScalarValue({ num: 4n, den: 1n }),
    },
  };
  const euclidOnGaussian = executeSlotsValue(gaussianInput, [{ operator: op("op_euclid_div"), operand: 4n }]);
  assert.deepEqual(
    euclidOnGaussian,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 1n, den: 1n }),
          im: toRationalScalarValue({ num: 1n, den: 1n }),
        },
      },
    },
    "euclid-div on gaussian complex returns gaussian quotient",
  );

  const modOnGaussian = executeSlotsValue(gaussianInput, [{ operator: op("op_mod"), operand: 4n }]);
  assert.deepEqual(
    modOnGaussian,
    { ok: true, total: toRationalCalculatorValue({ num: -1n, den: 1n }) },
    "mod on gaussian complex returns gaussian remainder",
  );

  const irrationalMagnitudeInput = {
    kind: "complex" as const,
    value: {
      re: toRationalScalarValue({ num: 3n, den: 1n }),
      im: toRationalScalarValue({ num: 3n, den: 1n }),
    },
  };
  const euclidOnIrrationalMagnitude = executeSlotsValue(irrationalMagnitudeInput, [{ operator: op("op_euclid_div"), operand: 2n }]);
  assert.deepEqual(
    euclidOnIrrationalMagnitude,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 2n, den: 1n }),
          im: toRationalScalarValue({ num: 2n, den: 1n }),
        },
      },
    },
    "euclid-div on gaussian complex rounds both components to nearest integer quotient",
  );

  const modOnIrrationalMagnitude = executeSlotsValue(irrationalMagnitudeInput, [{ operator: op("op_mod"), operand: 2n }]);
  assert.deepEqual(
    modOnIrrationalMagnitude,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: -1n, den: 1n }),
          im: toRationalScalarValue({ num: -1n, den: 1n }),
        },
      },
    },
    "mod on gaussian complex returns gaussian remainder from rounded quotient",
  );

  const gcdOnGaussian = executeSlotsValue(gaussianInput, [{ operator: op("op_gcd"), operand: 15n }]);
  assert.deepEqual(gcdOnGaussian, { ok: true, total: toRationalCalculatorValue({ num: 5n, den: 1n }) }, "gcd on gaussian complex uses norm");

  const lcmOnGaussian = executeSlotsValue(gaussianInput, [{ operator: op("op_lcm"), operand: 6n }]);
  assert.deepEqual(lcmOnGaussian, { ok: true, total: toRationalCalculatorValue({ num: 150n, den: 1n }) }, "lcm on gaussian complex uses norm");

  const sigmaOnGaussian = executeSlotsValue(gaussianInput, [{ kind: "unary", operator: uop("unary_sigma") }]);
  assert.deepEqual(sigmaOnGaussian, { ok: true, total: toRationalCalculatorValue({ num: 31n, den: 1n }) }, "sigma on gaussian complex uses norm");

  const collatzOnGaussian = executeSlotsValue(gaussianInput, [{ kind: "unary", operator: uop("unary_collatz") }]);
  assert.deepEqual(
    collatzOnGaussian,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 10n, den: 1n }),
          im: toRationalScalarValue({ num: 2n, den: 1n }),
        },
      },
    },
    "collatz on gaussian complex is componentwise",
  );

  const floorOnComplex = executeSlotsValue(
    {
      kind: "complex",
      value: {
        re: toRationalScalarValue({ num: 9n, den: 2n }),
        im: toRationalScalarValue({ num: 43n, den: 5n }),
      },
    },
    [{ kind: "unary", operator: uop("unary_floor") }],
  );
  assert.deepEqual(
    floorOnComplex,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 4n, den: 1n }),
          im: toRationalScalarValue({ num: 8n, den: 1n }),
        },
      },
    },
    "floor on complex is componentwise",
  );

  const maxOnComplex = executeSlotsValue(gaussianInput, [{ operator: op("op_max"), operand: 6n }]);
  assert.deepEqual(maxOnComplex, { ok: true, total: toRationalCalculatorValue({ num: 6n, den: 1n }) }, "max compares by magnitude");

  const minOnComplex = executeSlotsValue(gaussianInput, [{ operator: op("op_min"), operand: 6n }]);
  assert.deepEqual(minOnComplex, { ok: true, total: gaussianInput }, "min compares by magnitude");

  const maxTieKeepsLeft = executeSlotsValue(
    {
      kind: "complex",
      value: {
        re: toRationalScalarValue({ num: 3n, den: 1n }),
        im: toRationalScalarValue({ num: 4n, den: 1n }),
      },
    },
    [{ operator: op("op_max"), operand: 5n }],
  );
  assert.deepEqual(maxTieKeepsLeft, { ok: true, total: gaussianInput }, "max tie keeps left operand");
};



