function toBigInt(value) {
  if (value === "" || value == null) {
    return 0n;
  }
  return BigInt(value);
}

function resetCalculator(calc) {
  return {
    ...calc,
    display: "0",
    entry: "",
    accumulator: null,
    pendingOp: null,
    justEvaluated: false
  };
}

function pressDigit(calc, digit) {
  let nextEntry = calc.entry;

  if (calc.justEvaluated && calc.pendingOp == null) {
    nextEntry = "";
  }

  if (nextEntry === "0") {
    nextEntry = digit;
  } else {
    nextEntry = `${nextEntry}${digit}`;
  }

  return {
    ...calc,
    entry: nextEntry,
    display: nextEntry,
    justEvaluated: false
  };
}

function pressPlus(calc) {
  const entryValue = toBigInt(calc.entry || calc.display);

  if (calc.pendingOp === "+") {
    const sum = toBigInt(calc.accumulator) + toBigInt(calc.entry);
    return {
      ...calc,
      display: sum.toString(),
      entry: "",
      accumulator: sum,
      pendingOp: "+",
      justEvaluated: false
    };
  }

  return {
    ...calc,
    display: entryValue.toString(),
    entry: "",
    accumulator: entryValue,
    pendingOp: "+",
    justEvaluated: false
  };
}

function pressEquals(calc) {
  let result = toBigInt(calc.entry || calc.display);

  if (calc.pendingOp === "+") {
    const left = toBigInt(calc.accumulator);
    const right = calc.entry === "" ? 0n : toBigInt(calc.entry);
    result = left + right;
  }

  return {
    calculator: {
      ...calc,
      display: result.toString(),
      entry: "",
      accumulator: null,
      pendingOp: null,
      justEvaluated: true
    },
    result
  };
}

export function applyKeyPress(calculator, key) {
  if (key === "C") {
    return { calculator: resetCalculator(calculator), equalsResult: null };
  }
  if (key === "1" || key === "2") {
    return { calculator: pressDigit(calculator, key), equalsResult: null };
  }
  if (key === "+") {
    return { calculator: pressPlus(calculator), equalsResult: null };
  }
  if (key === "=") {
    const next = pressEquals(calculator);
    return { calculator: next.calculator, equalsResult: next.result };
  }

  return { calculator, equalsResult: null };
}
