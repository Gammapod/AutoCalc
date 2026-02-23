(function () {
  var SAVE_VERSION = 1;
  var SAVE_KEY = "autocalc.v0_1.save";
  var DIGIT_UNLOCK_COST = 1n;
  var OPERATOR_UNLOCK_COST = 1n;
  var AUTOSAVE_INTERVAL_MS = 5000;
  var DISPLAY_SLOTS = 12;
  var LOCKABLE_DIGITS = ["0", "2", "3", "4", "5", "6", "7", "8", "9"];
  var LOCKABLE_OPERATORS = ["*", "/"];

  function createDefaultUnlocks() {
    var unlocked = {};
    for (var i = 0; i < LOCKABLE_DIGITS.length; i += 1) {
      unlocked[LOCKABLE_DIGITS[i]] = false;
    }
    return unlocked;
  }

  function createDefaultOperatorUnlocks() {
    var unlocked = {};
    for (var i = 0; i < LOCKABLE_OPERATORS.length; i += 1) {
      unlocked[LOCKABLE_OPERATORS[i]] = false;
    }
    return unlocked;
  }

  function createInitialState() {
    return {
      calculator: {
        display: "0",
        entry: "",
        accumulator: null,
        pendingOp: null,
        justEvaluated: false
      },
      unlocked: createDefaultUnlocks(),
      unlockedOperators: createDefaultOperatorUnlocks()
    };
  }

  function toBigInt(value) {
    if (value === "" || value == null) {
      return 0n;
    }
    return BigInt(value);
  }

  function resetCalculator(calc) {
    return {
      display: "0",
      entry: "",
      accumulator: null,
      pendingOp: null,
      justEvaluated: false
    };
  }

  function pressDigit(calc, digit) {
    var nextEntry = calc.entry;
    if (calc.justEvaluated) {
      nextEntry = "";
    }
    if (nextEntry === "0") {
      nextEntry = digit;
    } else {
      nextEntry = nextEntry + digit;
    }

    var nextDisplay = calc.display;
    if (calc.pendingOp == null) {
      nextDisplay = nextEntry;
    } else if (calc.accumulator != null) {
      nextDisplay = calc.accumulator.toString();
    }

    return {
      display: nextDisplay,
      entry: nextEntry,
      accumulator: calc.accumulator,
      pendingOp: calc.pendingOp,
      justEvaluated: false
    };
  }

  function pressPlus(calc) {
    return pressOperator(calc, "+");
  }

  function applyOperation(left, right, operator) {
    if (operator === "+") {
      return left + right;
    }
    if (operator === "-") {
      return left - right;
    }
    if (operator === "*") {
      return left * right;
    }
    if (operator === "/") {
      if (right === 0n) {
        return 0n;
      }
      return left / right;
    }
    return right;
  }

  function pressOperator(calc, operator) {
    var entryValue = toBigInt(calc.entry || calc.display);
    if (calc.pendingOp === "+" || calc.pendingOp === "-" || calc.pendingOp === "*" || calc.pendingOp === "/") {
      var right = calc.entry === "" ? 0n : toBigInt(calc.entry);
      var result = applyOperation(toBigInt(calc.accumulator), right, calc.pendingOp);
      return {
        display: result.toString(),
        entry: "",
        accumulator: result,
        pendingOp: operator,
        justEvaluated: false
      };
    }
    return {
      display: entryValue.toString(),
      entry: "",
      accumulator: entryValue,
      pendingOp: operator,
      justEvaluated: false
    };
  }

  function pressEquals(calc) {
    if (!(calc.pendingOp === "+" || calc.pendingOp === "-" || calc.pendingOp === "*" || calc.pendingOp === "/")) {
      return calc;
    }

    var rightText = calc.entry === "" ? "0" : calc.entry;
    var left = calc.accumulator == null ? toBigInt(calc.display) : toBigInt(calc.accumulator);
    var right = toBigInt(rightText);
    var result = applyOperation(left, right, calc.pendingOp);

    return {
      display: result.toString(),
      entry: rightText,
      accumulator: result,
      pendingOp: calc.pendingOp,
      justEvaluated: true
    };
  }

  function isDigitKey(key) {
    return typeof key === "string" && key.length === 1 && key >= "0" && key <= "9";
  }

  function applyKeyPress(calculator, key) {
    if (key === "C") {
      return resetCalculator(calculator);
    }
    if (isDigitKey(key)) {
      return pressDigit(calculator, key);
    }
    if (key === "+") {
      return pressPlus(calculator);
    }
    if (key === "-") {
      return pressOperator(calculator, "-");
    }
    if (key === "*") {
      return pressOperator(calculator, "*");
    }
    if (key === "/") {
      return pressOperator(calculator, "/");
    }
    if (key === "=") {
      return pressEquals(calculator);
    }
    return calculator;
  }

  function isDigitUnlocked(unlocked, digit) {
    if (digit === "1") {
      return true;
    }
    return !!unlocked[digit];
  }

  function isOperatorUnlocked(unlockedOperators, operator) {
    if (operator === "+" || operator === "-" || operator === "=" || operator === "C") {
      return true;
    }
    return !!unlockedOperators[operator];
  }

  function canUseKey(state, key) {
    if (isDigitKey(key)) {
      return isDigitUnlocked(state.unlocked, key);
    }
    if (key === "+" || key === "-" || key === "*" || key === "/" || key === "=" || key === "C") {
      return isOperatorUnlocked(state.unlockedOperators, key);
    }
    return false;
  }

  function reduce(state, action) {
    if (action.type === "PRESS_KEY") {
      var key = action.key;
      if (!canUseKey(state, key)) {
        return state;
      }
      var nextCalculator = applyKeyPress(state.calculator, key);
      return {
        calculator: nextCalculator,
        unlocked: state.unlocked,
        unlockedOperators: state.unlockedOperators
      };
    }

    if (action.type === "BUY_DIGIT_UNLOCK") {
      var digit = action.digit;
      if (LOCKABLE_DIGITS.indexOf(digit) === -1) {
        return state;
      }
      var currentValue = toBigInt(state.calculator.display);
      if (state.unlocked[digit] || currentValue < DIGIT_UNLOCK_COST) {
        return state;
      }
      var remaining = currentValue - DIGIT_UNLOCK_COST;
      var unlockedAfterBuy = Object.assign({}, state.unlocked);
      unlockedAfterBuy[digit] = true;
      var preserveOp = state.calculator.pendingOp;
      return {
        calculator: {
          display: remaining.toString(),
          entry: "",
          accumulator: preserveOp ? remaining : null,
          pendingOp: preserveOp,
          justEvaluated: !preserveOp
        },
        unlocked: unlockedAfterBuy,
        unlockedOperators: state.unlockedOperators
      };
    }

    if (action.type === "BUY_OPERATOR_UNLOCK") {
      var operator = action.operator;
      if (LOCKABLE_OPERATORS.indexOf(operator) === -1) {
        return state;
      }
      var currentValueForOp = toBigInt(state.calculator.display);
      if (state.unlockedOperators[operator] || currentValueForOp < OPERATOR_UNLOCK_COST) {
        return state;
      }
      var remainingForOp = currentValueForOp - OPERATOR_UNLOCK_COST;
      var unlockedOpsAfterBuy = Object.assign({}, state.unlockedOperators);
      unlockedOpsAfterBuy[operator] = true;
      var preserveOpForOpBuy = state.calculator.pendingOp;
      return {
        calculator: {
          display: remainingForOp.toString(),
          entry: "",
          accumulator: preserveOpForOpBuy ? remainingForOp : null,
          pendingOp: preserveOpForOpBuy,
          justEvaluated: !preserveOpForOpBuy
        },
        unlocked: state.unlocked,
        unlockedOperators: unlockedOpsAfterBuy
      };
    }

    if (action.type === "DEBUG_UNLOCK_DIGIT") {
      if (LOCKABLE_DIGITS.indexOf(action.digit) === -1) {
        return state;
      }
      var unlockedSingle = Object.assign({}, state.unlocked);
      unlockedSingle[action.digit] = true;
      return {
        calculator: state.calculator,
        unlocked: unlockedSingle,
        unlockedOperators: state.unlockedOperators
      };
    }

    if (action.type === "DEBUG_UNLOCK_ALL") {
      var unlockedAll = createDefaultUnlocks();
      for (var i = 0; i < LOCKABLE_DIGITS.length; i += 1) {
        unlockedAll[LOCKABLE_DIGITS[i]] = true;
      }
      var unlockedOpsAll = createDefaultOperatorUnlocks();
      for (var j = 0; j < LOCKABLE_OPERATORS.length; j += 1) {
        unlockedOpsAll[LOCKABLE_OPERATORS[j]] = true;
      }
      return {
        calculator: state.calculator,
        unlocked: unlockedAll,
        unlockedOperators: unlockedOpsAll
      };
    }

    if (action.type === "RESET_STATE") {
      return createInitialState();
    }

    return state;
  }

  function serialize(state) {
    return {
      version: SAVE_VERSION,
      unlocked: state.unlocked,
      unlockedOperators: state.unlockedOperators,
      calculator: {
        display: String(state.calculator.display),
        entry: String(state.calculator.entry),
        accumulator: state.calculator.accumulator == null ? null : state.calculator.accumulator.toString(),
        pendingOp: state.calculator.pendingOp,
        justEvaluated: !!state.calculator.justEvaluated
      }
    };
  }

  function parseBigIntOrNull(value) {
    if (value == null) {
      return null;
    }
    return BigInt(value);
  }

  function parse(raw) {
    if (!raw || typeof raw !== "object" || raw.version !== SAVE_VERSION) {
      return null;
    }
    var parsedUnlocks = createDefaultUnlocks();
    for (var i = 0; i < LOCKABLE_DIGITS.length; i += 1) {
      var digit = LOCKABLE_DIGITS[i];
      if (digit === "2" && raw.unlocked && raw.unlocked.digit2 != null) {
        parsedUnlocks[digit] = !!raw.unlocked.digit2;
      } else {
        parsedUnlocks[digit] = !!(raw.unlocked && raw.unlocked[digit]);
      }
    }
    var parsedOperatorUnlocks = createDefaultOperatorUnlocks();
    for (var j = 0; j < LOCKABLE_OPERATORS.length; j += 1) {
      var operator = LOCKABLE_OPERATORS[j];
      parsedOperatorUnlocks[operator] = !!(raw.unlockedOperators && raw.unlockedOperators[operator]);
    }
    return {
      calculator: {
        display: String(raw.calculator && raw.calculator.display != null ? raw.calculator.display : "0"),
        entry: String(raw.calculator && raw.calculator.entry != null ? raw.calculator.entry : ""),
        accumulator: parseBigIntOrNull(raw.calculator ? raw.calculator.accumulator : null),
        pendingOp: raw.calculator ? raw.calculator.pendingOp : null,
        justEvaluated: !!(raw.calculator && raw.calculator.justEvaluated)
      },
      unlocked: parsedUnlocks,
      unlockedOperators: parsedOperatorUnlocks
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        return createInitialState();
      }
      var parsed = JSON.parse(raw);
      return parse(parsed) || createInitialState();
    } catch (err) {
      return createInitialState();
    }
  }

  function saveState(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)));
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  function setButtonState(button, enabled) {
    button.disabled = !enabled;
    if (enabled) {
      button.classList.remove("key-hidden");
    } else {
      button.classList.add("key-hidden");
    }
  }

  function buildLcd(displayNode, slotCount) {
    var chars = [];
    displayNode.textContent = "";
    for (var i = 0; i < slotCount; i += 1) {
      var slot = document.createElement("span");
      slot.className = "lcd-slot blank";
      var charNode = document.createElement("span");
      charNode.className = "lcd-char";
      charNode.textContent = " ";
      slot.appendChild(charNode);
      displayNode.appendChild(slot);
      chars.push(charNode);
    }
    return chars;
  }

  function renderLcd(charNodes, value) {
    var trimmed = String(value);
    if (trimmed.length > charNodes.length) {
      trimmed = trimmed.slice(trimmed.length - charNodes.length);
    }

    var padding = charNodes.length - trimmed.length;
    for (var i = 0; i < charNodes.length; i += 1) {
      var isBlank = i < padding;
      var character = isBlank ? " " : trimmed.charAt(i - padding);
      charNodes[i].textContent = character;
      if (isBlank) {
        charNodes[i].parentElement.classList.add("blank");
      } else {
        charNodes[i].parentElement.classList.remove("blank");
      }
    }
  }

  function render(state, nodes) {
    renderLcd(nodes.displayChars, state.calculator.display);
    renderLcd(
      nodes.secondaryDisplayChars,
      state.calculator.pendingOp ? (state.calculator.entry === "" ? "0" : state.calculator.entry) : ""
    );
    nodes.secondaryOp.textContent = state.calculator.pendingOp ? state.calculator.pendingOp : "";
    nodes.unlockWindow.classList.toggle("hidden", state.calculator.pendingOp !== "-");

    for (var i = 0; i < LOCKABLE_DIGITS.length; i += 1) {
      var digit = LOCKABLE_DIGITS[i];
      var keyButton = nodes.keyButtons[digit];
      if (keyButton) {
        setButtonState(keyButton, !!state.unlocked[digit]);
      }
    }

    for (var k = 0; k < LOCKABLE_OPERATORS.length; k += 1) {
      var op = LOCKABLE_OPERATORS[k];
      var opKeyButton = nodes.operatorKeyButtons[op];
      if (opKeyButton) {
        setButtonState(opKeyButton, !!state.unlockedOperators[op]);
      }
    }

    var canAffordAnyUnlock = toBigInt(state.calculator.display) >= DIGIT_UNLOCK_COST;
    for (var j = 0; j < nodes.digitUnlockButtons.length; j += 1) {
      var unlockButton = nodes.digitUnlockButtons[j];
      var unlockDigit = unlockButton.dataset.buyDigit;
      var unlocked = !!state.unlocked[unlockDigit];
      if (unlocked) {
        unlockButton.disabled = true;
        unlockButton.textContent = unlockDigit + " unlocked";
      } else {
        unlockButton.disabled = !canAffordAnyUnlock;
        unlockButton.textContent = "Unlock " + unlockDigit + " (cost: " + DIGIT_UNLOCK_COST.toString() + ")";
      }
    }

    var canAffordAnyOpUnlock = toBigInt(state.calculator.display) >= OPERATOR_UNLOCK_COST;
    for (var m = 0; m < nodes.operatorUnlockButtons.length; m += 1) {
      var unlockOpButton = nodes.operatorUnlockButtons[m];
      var unlockOp = unlockOpButton.dataset.buyOp;
      var opUnlocked = !!state.unlockedOperators[unlockOp];
      if (opUnlocked) {
        unlockOpButton.disabled = true;
        unlockOpButton.textContent = unlockOp + " unlocked";
      } else {
        unlockOpButton.disabled = !canAffordAnyOpUnlock;
        unlockOpButton.textContent = "Unlock " + unlockOp + " (cost: " + OPERATOR_UNLOCK_COST.toString() + ")";
      }
    }
  }

  function collectKeyButtons() {
    var keyButtons = {};
    var allKeyButtons = document.querySelectorAll("[data-key]");
    for (var i = 0; i < allKeyButtons.length; i += 1) {
      var button = allKeyButtons[i];
      var key = button.dataset.key;
      if (isDigitKey(key)) {
        keyButtons[key] = button;
      }
    }
    return keyButtons;
  }

  function collectOperatorKeyButtons() {
    var opButtons = {};
    var allKeyButtons = document.querySelectorAll("[data-key]");
    for (var i = 0; i < allKeyButtons.length; i += 1) {
      var button = allKeyButtons[i];
      var key = button.dataset.key;
      if (LOCKABLE_OPERATORS.indexOf(key) !== -1) {
        opButtons[key] = button;
      }
    }
    return opButtons;
  }

  var nodes = {
    display: document.getElementById("display"),
    secondaryDisplay: document.getElementById("secondary-display"),
    secondaryOp: document.getElementById("secondary-op"),
    unlockWindow: document.getElementById("unlock-window"),
    keyButtons: collectKeyButtons(),
    operatorKeyButtons: collectOperatorKeyButtons(),
    digitUnlockButtons: Array.prototype.slice.call(document.querySelectorAll("[data-buy-digit]")),
    operatorUnlockButtons: Array.prototype.slice.call(document.querySelectorAll("[data-buy-op]"))
  };
  nodes.displayChars = buildLcd(nodes.display, DISPLAY_SLOTS);
  nodes.secondaryDisplayChars = buildLcd(nodes.secondaryDisplay, DISPLAY_SLOTS);

  var state = loadState();
  var isDirty = false;

  function doSave() {
    saveState(state);
    isDirty = false;
  }

  function dispatch(action) {
    if (action.type === "RESET_SAVE") {
      clearSave();
      state = reduce(state, { type: "RESET_STATE" });
      doSave();
      render(state, nodes);
      return;
    }

    var nextState = reduce(state, action);
    if (nextState !== state) {
      state = nextState;
      isDirty = true;
      render(state, nodes);
    }

    if (
      action.type === "BUY_DIGIT_UNLOCK" ||
      action.type === "BUY_OPERATOR_UNLOCK" ||
      action.type === "DEBUG_UNLOCK_DIGIT" ||
      action.type === "DEBUG_UNLOCK_ALL" ||
      (action.type === "PRESS_KEY" && action.key === "C")
    ) {
      doSave();
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    var key = target.dataset.key;
    if (key) {
      dispatch({ type: "PRESS_KEY", key: key });
      return;
    }

    var buyDigit = target.dataset.buyDigit;
    if (buyDigit) {
      dispatch({ type: "BUY_DIGIT_UNLOCK", digit: buyDigit });
      return;
    }

    var buyOp = target.dataset.buyOp;
    if (buyOp) {
      dispatch({ type: "BUY_OPERATOR_UNLOCK", operator: buyOp });
      return;
    }

    if (target.id === "debug-unlock-all") {
      dispatch({ type: "DEBUG_UNLOCK_ALL" });
      return;
    }

    if (target.id === "reset-save") {
      dispatch({ type: "RESET_SAVE" });
    }
  });

  render(state, nodes);
  setInterval(function () {
    if (isDirty) {
      doSave();
    }
  }, AUTOSAVE_INTERVAL_MS);
})();
