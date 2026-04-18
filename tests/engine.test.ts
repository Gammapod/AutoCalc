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

  const wholeStepsOne = executeSlots(r(1n), [{ operator: op("op_whole_steps"), operand: 1n }]);
  assert.deepEqual(wholeStepsOne, { ok: true, total: r(9n, 8n) }, "whole-steps applies one 9/8 multiplier");

  const wholeStepsTwo = executeSlots(r(1n), [{ operator: op("op_whole_steps"), operand: 2n }]);
  assert.deepEqual(wholeStepsTwo, { ok: true, total: r(81n, 64n) }, "whole-steps composes repeated 9/8 multipliers");

  const wholeStepsThreeOnTwo = executeSlots(r(2n), [{ operator: op("op_whole_steps"), operand: 3n }]);
  assert.deepEqual(wholeStepsThreeOnTwo, { ok: true, total: r(729n, 256n) }, "whole-steps scales arbitrary totals by (9/8)^b");

  const intervalOneOnTwo = executeSlots(r(1n), [{ operator: op("op_interval"), operand: 2n }]);
  assert.deepEqual(intervalOneOnTwo, { ok: true, total: r(3n, 2n) }, "interval scales by (1 + 1/b)");

  const intervalFourOnTwo = executeSlots(r(4n), [{ operator: op("op_interval"), operand: 2n }]);
  assert.deepEqual(intervalFourOnTwo, { ok: true, total: r(6n) }, "interval preserves integer exactness when ratio simplifies");

  const intervalTwoOnFour = executeSlots(r(2n), [{ operator: op("op_interval"), operand: 4n }]);
  assert.deepEqual(intervalTwoOnFour, { ok: true, total: r(5n, 2n) }, "interval handles larger denominators exactly");

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

  const eulogOnSixty = executeSlots(r(60n), [{ operator: op("op_eulog"), operand: 2n }]);
  assert.deepEqual(
    eulogOnSixty,
    { ok: true, total: r(2n) },
    "eulog returns b-valuation for divisible input",
  );

  const eulogOnFifteen = executeSlots(r(15n), [{ operator: op("op_eulog"), operand: 2n }]);
  assert.deepEqual(
    eulogOnFifteen,
    { ok: true, total: r(0n) },
    "eulog returns zero valuation when base does not divide input",
  );

  const eulogOnTen = executeSlots(r(10n), [{ operator: op("op_eulog"), operand: 5n }]);
  assert.deepEqual(
    eulogOnTen,
    { ok: true, total: r(1n) },
    "eulog handles non-prime divisors as valuation bases",
  );

  const residualOnSixty = executeSlots(r(60n), [{ operator: op("op_residual"), operand: 2n }]);
  assert.deepEqual(
    residualOnSixty,
    { ok: true, total: r(15n) },
    "residual returns post-valuation cofactor",
  );

  const residualOnFifteen = executeSlots(r(15n), [{ operator: op("op_residual"), operand: 2n }]);
  assert.deepEqual(
    residualOnFifteen,
    { ok: true, total: r(15n) },
    "residual preserves value when valuation is zero",
  );

  const residualOnTen = executeSlots(r(10n), [{ operator: op("op_residual"), operand: 5n }]);
  assert.deepEqual(
    residualOnTen,
    { ok: true, total: r(2n) },
    "residual matches expected cofactor after removing b-adic power",
  );

  const logTupleOnSixty = executeSlotsValue(
    toRationalCalculatorValue({ num: 60n, den: 1n }),
    [{ operator: op("op_log_tuple"), operand: 2n }],
  );
  assert.deepEqual(
    logTupleOnSixty,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 2n, den: 1n }),
          im: toRationalScalarValue({ num: 15n, den: 1n }),
        },
      },
    },
    "log tuple returns valuation as real and residual as imaginary for divisible input",
  );

  const logTupleOnFifteen = executeSlotsValue(
    toRationalCalculatorValue({ num: 15n, den: 1n }),
    [{ operator: op("op_log_tuple"), operand: 2n }],
  );
  assert.deepEqual(
    logTupleOnFifteen,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 0n, den: 1n }),
          im: toRationalScalarValue({ num: 15n, den: 1n }),
        },
      },
    },
    "log tuple returns zero valuation with unchanged residual when base does not divide input",
  );

  const logTupleOnTen = executeSlotsValue(
    toRationalCalculatorValue({ num: 10n, den: 1n }),
    [{ operator: op("op_log_tuple"), operand: 5n }],
  );
  assert.deepEqual(
    logTupleOnTen,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 1n, den: 1n }),
          im: toRationalScalarValue({ num: 2n, den: 1n }),
        },
      },
    },
    "log tuple supports non-prime bases and returns expected complex tuple",
  );

  const euclidTupleSimple = executeSlotsValue(
    toRationalCalculatorValue({ num: 4n, den: 1n }),
    [{ operator: op("op_euclid_tuple"), operand: 3n }],
  );
  assert.deepEqual(
    euclidTupleSimple,
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
    "euclidean tuple encodes quotient and remainder as q + i*r",
  );

  const euclidTupleNoRemainder = executeSlotsValue(
    toRationalCalculatorValue({ num: 60n, den: 1n }),
    [{ operator: op("op_euclid_tuple"), operand: 3n }],
  );
  assert.deepEqual(
    euclidTupleNoRemainder,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 20n, den: 1n }),
          im: toRationalScalarValue({ num: 0n, den: 1n }),
        },
      },
    },
    "euclidean tuple keeps explicit complex form when remainder is zero",
  );

  const euclidTupleGeneral = executeSlotsValue(
    toRationalCalculatorValue({ num: 18n, den: 1n }),
    [{ operator: op("op_euclid_tuple"), operand: 7n }],
  );
  assert.deepEqual(
    euclidTupleGeneral,
    {
      ok: true,
      total: {
        kind: "complex",
        value: {
          re: toRationalScalarValue({ num: 2n, den: 1n }),
          im: toRationalScalarValue({ num: 4n, den: 1n }),
        },
      },
    },
    "euclidean tuple supports non-zero quotient and remainder",
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

  const unaryReciprocalRational = executeSlots(r(2n), [{ kind: "unary", operator: uop("unary_reciprocal") }]);
  assert.deepEqual(unaryReciprocalRational, { ok: true, total: r(1n, 2n) }, "reciprocal maps integer totals to exact reciprocals");

  const unaryReciprocalZero = executeSlots(r(0n), [{ kind: "unary", operator: uop("unary_reciprocal") }]);
  assert.deepEqual(unaryReciprocalZero, { ok: false, reason: "division_by_zero" }, "reciprocal rejects zero with division-by-zero");

  const collatzNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_collatz") }]);
  assert.deepEqual(collatzNanInput, { ok: false, reason: "nan_input" }, "collatz rejects non-integer totals");

  const sortNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_sort_asc") }]);
  assert.deepEqual(sortNanInput, { ok: false, reason: "nan_input" }, "sort-asc rejects non-integer totals");

  const mirrorNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_mirror_digits") }]);
  assert.deepEqual(mirrorNanInput, { ok: false, reason: "nan_input" }, "mirror rejects non-integer totals");

  const notNanInput = executeSlots(r(3n, 2n), [{ kind: "unary", operator: uop("unary_not") }]);
  assert.deepEqual(notNanInput, { ok: false, reason: "nan_input" }, "not rejects non-integer totals");

  const reciprocalOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 1n }),
      toRationalScalarValue({ num: 4n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_reciprocal") }],
  );
  assert.deepEqual(
    reciprocalOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 41n }),
        toRationalScalarValue({ num: -4n, den: 41n }),
      ),
    },
    "reciprocal maps a+bi to (a-bi)/(a^2+b^2)",
  );

  const plusIOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 4n }),
      toRationalScalarValue({ num: 2n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_plus_i") }],
  );
  assert.deepEqual(
    plusIOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 4n }),
        toRationalScalarValue({ num: 3n, den: 1n }),
      ),
    },
    "plus-i increments the imaginary component",
  );

  const minusIOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 1n }),
      toRationalScalarValue({ num: -10n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_minus_i") }],
  );
  assert.deepEqual(
    minusIOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 1n }),
        toRationalScalarValue({ num: -11n, den: 1n }),
      ),
    },
    "minus-i decrements the imaginary component",
  );

  const plusIOnReal = executeSlotsValue(
    toRationalCalculatorValue({ num: 8n, den: 1n }),
    [{ kind: "unary", operator: uop("unary_plus_i") }],
  );
  assert.deepEqual(
    plusIOnReal,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 8n, den: 1n }),
        toRationalScalarValue({ num: 1n, den: 1n }),
      ),
    },
    "plus-i upgrades real totals to complex totals",
  );

  const conjugateOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 4n }),
      toRationalScalarValue({ num: 2n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_conjugate") }],
  );
  assert.deepEqual(
    conjugateOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 4n }),
        toRationalScalarValue({ num: -2n, den: 1n }),
      ),
    },
    "conjugate flips the imaginary sign",
  );

  const realFlipOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 1n }),
      toRationalScalarValue({ num: -10n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_real_flip") }],
  );
  assert.deepEqual(
    realFlipOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: -5n, den: 1n }),
        toRationalScalarValue({ num: -10n, den: 1n }),
      ),
    },
    "real-flip flips the real sign",
  );

  const imaginaryPartOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 4n }),
      toRationalScalarValue({ num: 2n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_imaginary_part") }],
  );
  assert.deepEqual(
    imaginaryPartOnComplex,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 0n, den: 1n }),
        toRationalScalarValue({ num: 2n, den: 1n }),
      ),
    },
    "imaginary-part returns the pure imaginary projection",
  );

  const realPartOnComplex = executeSlotsValue(
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 4n }),
      toRationalScalarValue({ num: 2n, den: 1n }),
    ),
    [{ kind: "unary", operator: uop("unary_real_part") }],
  );
  assert.deepEqual(
    realPartOnComplex,
    {
      ok: true,
      total: toRationalCalculatorValue({ num: 5n, den: 4n }),
    },
    "real-part returns the real component as a scalar total",
  );

  const rollNumberAsOperand = executeSlots(
    r(10n),
    [{ operator: op("op_add"), operand: { type: "symbolic", text: "№" } }],
    { currentRollNumber: 7n },
  );
  assert.deepEqual(rollNumberAsOperand, { ok: true, total: r(17n) }, "roll-number symbolic operand resolves to runtime roll number");

  const rollNumberInExecuteSlotsValue = executeSlotsValue(
    toRationalCalculatorValue({ num: 11n, den: 1n }),
    [{ operator: op("op_mul"), operand: { type: "symbolic", text: "№" } }],
    { currentRollNumber: 3n },
  );
  assert.deepEqual(
    rollNumberInExecuteSlotsValue,
    { ok: true, total: toRationalCalculatorValue({ num: 33n, den: 1n }) },
    "executeSlotsValue resolves roll-number symbolic operands before operator execution",
  );

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

  const binaryRotate15Three = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    [{ operator: op("op_rotate_15"), operand: 3n }],
  );
  const unaryRotate15Three = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    Array.from({ length: 3 }, () => ({ kind: "unary", operator: uop("unary_rotate_15") })),
  );
  assert.equal(binaryRotate15Three.ok && unaryRotate15Three.ok, true, "binary 15-degree rotation executes for integer operand");
  assert.equal(
    calculatorValuesEquivalent(
      binaryRotate15Three.ok ? binaryRotate15Three.total : toNanCalculatorValue(),
      unaryRotate15Three.ok ? unaryRotate15Three.total : toNanCalculatorValue(),
    ),
    true,
    "binary 15-degree rotation matches repeated unary 15-degree rotation",
  );

  const binaryRotate15NegativeOne = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    [{ operator: op("op_rotate_15"), operand: -1n }],
  );
  const unaryRotate15TwentyThree = executeSlotsValue(
    toRationalCalculatorValue({ num: 1n, den: 1n }),
    Array.from({ length: 23 }, () => ({ kind: "unary", operator: uop("unary_rotate_15") })),
  );
  assert.equal(
    calculatorValuesEquivalent(
      binaryRotate15NegativeOne.ok ? binaryRotate15NegativeOne.total : toNanCalculatorValue(),
      unaryRotate15TwentyThree.ok ? unaryRotate15TwentyThree.total : toNanCalculatorValue(),
    ),
    true,
    "binary 15-degree rotation normalizes negative operands modulo 24",
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

  const gaussianRationalInput = toComplexCalculatorValue(
    toRationalScalarValue({ num: 3n, den: 4n }),
    toRationalScalarValue({ num: 5n, den: 8n }),
  );

  const eulogOnGaussianRational = executeSlotsValue(gaussianRationalInput, [{ operator: op("op_eulog"), operand: 2n }]);
  assert.deepEqual(
    eulogOnGaussianRational,
    { ok: true, total: toRationalCalculatorValue({ num: -3n, den: 1n }) },
    "eulog on gaussian rational uses minimum component valuation at the integer base",
  );

  const residualOnGaussianRational = executeSlotsValue(gaussianRationalInput, [{ operator: op("op_residual"), operand: 2n }]);
  assert.deepEqual(
    residualOnGaussianRational,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 6n, den: 1n }),
        toRationalScalarValue({ num: 5n, den: 1n }),
      ),
    },
    "residual on gaussian rational divides by b^v and preserves exact complex arithmetic",
  );

  const logTupleOnGaussianRational = executeSlotsValue(gaussianRationalInput, [{ operator: op("op_log_tuple"), operand: 2n }]);
  assert.deepEqual(
    logTupleOnGaussianRational,
    {
      ok: true,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: -8n, den: 1n }),
        toRationalScalarValue({ num: 6n, den: 1n }),
      ),
    },
    "log tuple on gaussian rational returns v + i*residual",
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



