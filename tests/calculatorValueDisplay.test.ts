import assert from "node:assert/strict";
import {
  calculatorValueToDisplayParts,
  calculatorValueToDisplayString,
  toAlgebraicScalarValue,
  toExplicitComplexCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { algebraicToDisplayString } from "../src/domain/algebraicScalar.js";

export const runCalculatorValueDisplayTests = (): void => {
  assert.equal(
    algebraicToDisplayString({
      one: { num: 5n, den: 1n },
      sqrt2: { num: 7n, den: 1n },
      sqrt3: { num: -3n, den: 1n },
    }),
    "5 + 7\u00D7\u221A2 - 3\u00D7\u221A3",
    "algebraic display uses radical glyphs and multiplication signs",
  );
  assert.equal(algebraicToDisplayString({ sqrt2: { num: 1n, den: 1n } }), "\u221A2", "unit radical coefficient is hidden");
  assert.equal(algebraicToDisplayString({ sqrt3: { num: -1n, den: 1n } }), "-\u221A3", "negative unit radical coefficient is hidden");
  assert.equal(
    algebraicToDisplayString({ sqrt2: { num: 3n, den: 2n } }),
    "3\u20442\u00D7\u221A2",
    "fractional radical coefficients use multiplication signs",
  );
  assert.equal(
    algebraicToDisplayString({ sqrt6: { num: 1n, den: 6n } }),
    "1\u20446\u00D7\u221A6",
    "rationalized sqrt6 denominator displays as a fractional radical coefficient",
  );
  assert.equal(
    algebraicToDisplayString({ sqrt2: { num: -1n, den: 2n } }),
    "-1\u20442\u00D7\u221A2",
    "negative fractional radical coefficients keep the sign outside the coefficient text",
  );
  assert.equal(
    algebraicToDisplayString({ sqrt3: { num: 5n, den: 6n } }),
    "5\u20446\u00D7\u221A3",
    "non-unit fractional radical coefficients keep numerator and denominator before the radical",
  );
  assert.equal(
    algebraicToDisplayString({
      one: { num: 5n, den: 1n },
      sqrt2: { num: -3n, den: 2n },
      sqrt6: { num: 1n, den: 6n },
    }),
    "5 - 3\u20442\u00D7\u221A2 + 1\u20446\u00D7\u221A6",
    "mixed algebraic values preserve fractional radical coefficient formatting per term",
  );

  const realPart = toAlgebraicScalarValue({
    one: { num: 5n, den: 1n },
    sqrt2: { num: 7n, den: 1n },
    sqrt3: { num: -3n, den: 1n },
  });
  const positiveImaginaryPart = toAlgebraicScalarValue({
    one: { num: 3n, den: 1n },
    sqrt2: { num: 21n, den: 1n },
    sqrt3: { num: -5n, den: 1n },
  });
  const negativeImaginaryPart = toAlgebraicScalarValue({
    one: { num: -3n, den: 1n },
    sqrt2: { num: -21n, den: 1n },
    sqrt3: { num: 5n, den: 1n },
  });

  assert.equal(
    calculatorValueToDisplayString(toExplicitComplexCalculatorValue(realPart, positiveImaginaryPart)),
    "(5 + 7\u00D7\u221A2 - 3\u00D7\u221A3) + i\u00D7(3 + 21\u00D7\u221A2 - 5\u00D7\u221A3)",
    "positive imaginary algebraic complex values render with grouped imaginary part",
  );
  assert.equal(
    calculatorValueToDisplayString(toExplicitComplexCalculatorValue(realPart, negativeImaginaryPart)),
    "(5 + 7\u00D7\u221A2 - 3\u00D7\u221A3) - i\u00D7(3 + 21\u00D7\u221A2 - 5\u00D7\u221A3)",
    "negative imaginary algebraic complex values render with a subtraction sign",
  );
  assert.equal(
    calculatorValueToDisplayString(toExplicitComplexCalculatorValue(toRationalScalarValue({ num: 0n, den: 1n }), positiveImaginaryPart)),
    "i\u00D7(3 + 21\u00D7\u221A2 - 5\u00D7\u221A3)",
    "pure positive imaginary values omit the zero real part",
  );
  assert.equal(
    calculatorValueToDisplayString(toExplicitComplexCalculatorValue(toRationalScalarValue({ num: 0n, den: 1n }), negativeImaginaryPart)),
    "-i\u00D7(3 + 21\u00D7\u221A2 - 5\u00D7\u221A3)",
    "pure negative imaginary values omit the zero real part",
  );
  assert.deepEqual(
    calculatorValueToDisplayParts(toExplicitComplexCalculatorValue(realPart, negativeImaginaryPart)).map((part) => part.role ?? "default"),
    ["default", "default", "imaginary"],
    "structured complex display marks only the imaginary segment",
  );

  const fractionalRealPart = toAlgebraicScalarValue({
    one: { num: 5n, den: 1n },
    sqrt6: { num: 1n, den: 6n },
  });
  const fractionalNegativeImaginaryPart = toAlgebraicScalarValue({
    sqrt2: { num: -1n, den: 1n },
    sqrt3: { num: -5n, den: 6n },
  });
  assert.equal(
    calculatorValueToDisplayString(toExplicitComplexCalculatorValue(fractionalRealPart, fractionalNegativeImaginaryPart)),
    "(5 + 1\u20446\u00D7\u221A6) - i\u00D7(\u221A2 + 5\u20446\u00D7\u221A3)",
    "complex display preserves fractional radical coefficients inside grouped scalar parts",
  );
};

