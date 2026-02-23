(function () {
  var SAVE_VERSION = 1;
  var SAVE_KEY = "autocalc.v0_1.save";
  var AUTOSAVE_INTERVAL_MS = 5000;
  var DISPLAY_SLOTS = 12;
  var LOCKABLE_DIGITS = ["0", "2", "3", "4", "5", "6", "7", "8", "9"];
  var LOCKABLE_OPERATORS = ["-", "*", "/", "="];
  var LOCKABLE_UTILITIES = ["C", "CE"];
  var STORE_ITEMS = [
    { id: "digit_0", price: 10n, label: "Unlock digit 0", type: "digit", target: "0" },
    { id: "digit_2", price: 12n, label: "Unlock digit 2", type: "digit", target: "2" },
    { id: "digit_3", price: 13n, label: "Unlock digit 3", type: "digit", target: "3" },
    { id: "digit_4", price: 14n, label: "Unlock digit 4", type: "digit", target: "4" },
    { id: "digit_5", price: 15n, label: "Unlock digit 5", type: "digit", target: "5" },
    { id: "digit_6", price: 16n, label: "Unlock digit 6", type: "digit", target: "6" },
    { id: "digit_7", price: 17n, label: "Unlock digit 7", type: "digit", target: "7" },
    { id: "digit_8", price: 18n, label: "Unlock digit 8", type: "digit", target: "8" },
    { id: "digit_9", price: 19n, label: "Unlock digit 9", type: "digit", target: "9" },
    { id: "op_mul", price: 25n, label: "Unlock multiplication", type: "operator", target: "*" },
    { id: "op_div", price: 26n, label: "Unlock division", type: "operator", target: "/" },
    { id: "operand1_cap", price: 30n, label: "Operand 1 digit +1", type: "display_cap", target: "operand1Digits" },
    { id: "operand2_cap", price: 31n, label: "Operand 2 digit +1", type: "display_cap", target: "operand2Digits" }
  ];
  var CONDITIONAL_UNLOCK_RULES = [
    {
      id: "unlock_c_on_main_err",
      utility: "C",
      when: function (prevState, nextState) {
        return !prevState.calculator.operand1Error && nextState.calculator.operand1Error;
      }
    },
    {
      id: "unlock_ce_on_operand_err",
      utility: "CE",
      when: function (prevState, nextState) {
        return !prevState.calculator.operand2Error && nextState.calculator.operand2Error;
      }
    },
    {
      id: "unlock_minus_on_first_c_press",
      operator: "-",
      when: function (prevState, nextState, action) {
        return action.type === "PRESS_KEY" && action.key === "C";
      }
    },
    {
      id: "unlock_equals_on_total_4",
      operator: "=",
      when: function (prevState, nextState) {
        return (
          !nextState.calculator.operand1Error &&
          String(prevState.calculator.display) !== "4" &&
          String(nextState.calculator.display) === "4"
        );
      }
    }
  ];

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

  function createDefaultUtilityUnlocks() {
    var unlocked = {};
    for (var i = 0; i < LOCKABLE_UTILITIES.length; i += 1) {
      unlocked[LOCKABLE_UTILITIES[i]] = false;
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
        justEvaluated: false,
        operand1Error: false,
        operand2Error: false
      },
      unlocked: createDefaultUnlocks(),
      unlockedOperators: createDefaultOperatorUnlocks(),
      unlockedUtilities: createDefaultUtilityUnlocks(),
      displayUnlocks: {
        operand1Digits: 1,
        operand2Digits: 1
      },
      storeRevealed: false
    };
  }

  function toBigInt(value) {
    if (value === "" || value == null) {
      return 0n;
    }
    return BigInt(value);
  }

  function tryToBigInt(value) {
    try {
      return toBigInt(value);
    } catch (err) {
      return null;
    }
  }

  function countDigits(value) {
    var raw = String(value);
    var digitsOnly = raw.charAt(0) === "-" ? raw.slice(1) : raw;
    return digitsOnly.length;
  }

  function exceedsDigitLimit(value, limit) {
    return countDigits(value) > limit;
  }

  function resetCalculator(calc) {
    return {
      display: "0",
      entry: "",
      accumulator: null,
      pendingOp: null,
      justEvaluated: false,
      operand1Error: false,
      operand2Error: false
    };
  }

  function pressDigit(calc, digit, limits) {
    if (calc.pendingOp == null && calc.operand1Error) {
      return {
        display: digit,
        entry: digit,
        accumulator: null,
        pendingOp: null,
        justEvaluated: false,
        operand1Error: false,
        operand2Error: false
      };
    }

    if (calc.pendingOp != null && calc.operand2Error) {
      return {
        display: calc.display,
        entry: digit,
        accumulator: calc.accumulator,
        pendingOp: calc.pendingOp,
        justEvaluated: false,
        operand1Error: calc.operand1Error,
        operand2Error: false
      };
    }

    var nextEntry = calc.entry;
    if (calc.justEvaluated) {
      nextEntry = "";
    }
    if (nextEntry === "0") {
      nextEntry = digit;
    } else {
      nextEntry = nextEntry + digit;
    }

    if (calc.pendingOp == null && exceedsDigitLimit(nextEntry, limits.operand1Digits)) {
      return {
        display: "Err",
        entry: "",
        accumulator: null,
        pendingOp: null,
        justEvaluated: false,
        operand1Error: true,
        operand2Error: false
      };
    }

    if (calc.pendingOp != null && exceedsDigitLimit(nextEntry, limits.operand2Digits)) {
      return {
        display: calc.display,
        entry: "",
        accumulator: calc.accumulator,
        pendingOp: calc.pendingOp,
        justEvaluated: false,
        operand1Error: calc.operand1Error,
        operand2Error: true
      };
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
      justEvaluated: false,
      operand1Error: calc.operand1Error,
      operand2Error: calc.operand2Error
    };
  }

  function pressPlus(calc, limits) {
    return pressOperator(calc, "+", limits);
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

  function pressOperator(calc, operator, limits) {
    if (calc.operand1Error || calc.operand2Error) {
      return calc;
    }

    var entryValue = toBigInt(calc.entry || calc.display);
    if (calc.pendingOp === "+" || calc.pendingOp === "-" || calc.pendingOp === "*" || calc.pendingOp === "/") {
      var right = calc.entry === "" ? 0n : toBigInt(calc.entry);
      var result = applyOperation(toBigInt(calc.accumulator), right, calc.pendingOp);
      if (result < 0n) {
        return {
          display: "Err",
          entry: calc.entry,
          accumulator: null,
          pendingOp: operator,
          justEvaluated: false,
          operand1Error: true,
          operand2Error: false
        };
      }
      if (exceedsDigitLimit(result.toString(), limits.operand1Digits)) {
        return {
          display: "Err",
          entry: calc.entry,
          accumulator: null,
          pendingOp: operator,
          justEvaluated: false,
          operand1Error: true,
          operand2Error: calc.operand2Error
        };
      }
      return {
        display: result.toString(),
        entry: "",
        accumulator: result,
        pendingOp: operator,
        justEvaluated: false,
        operand1Error: false,
        operand2Error: false
      };
    }
    return {
      display: entryValue.toString(),
      entry: "",
      accumulator: entryValue,
      pendingOp: operator,
      justEvaluated: false,
      operand1Error: false,
      operand2Error: false
    };
  }

  function pressEquals(calc, limits) {
    if (calc.operand1Error || calc.operand2Error) {
      return calc;
    }
    if (!(calc.pendingOp === "+" || calc.pendingOp === "-" || calc.pendingOp === "*" || calc.pendingOp === "/")) {
      return calc;
    }

    var rightText = calc.entry === "" ? "0" : calc.entry;
    var left = calc.accumulator == null ? toBigInt(calc.display) : toBigInt(calc.accumulator);
    var right = toBigInt(rightText);
    var result = applyOperation(left, right, calc.pendingOp);
    if (result < 0n) {
      return {
        display: "Err",
        entry: rightText,
        accumulator: null,
        pendingOp: calc.pendingOp,
        justEvaluated: true,
        operand1Error: true,
        operand2Error: false
      };
    }

    if (exceedsDigitLimit(result.toString(), limits.operand1Digits)) {
      return {
        display: "Err",
        entry: rightText,
        accumulator: null,
        pendingOp: calc.pendingOp,
        justEvaluated: true,
        operand1Error: true,
        operand2Error: calc.operand2Error
      };
    }

    return {
      display: result.toString(),
      entry: rightText,
      accumulator: result,
      pendingOp: calc.pendingOp,
      justEvaluated: true,
      operand1Error: false,
      operand2Error: false
    };
  }

  function pressClearEntry(calc) {
    return {
      display: calc.display,
      entry: "",
      accumulator: null,
      pendingOp: null,
      justEvaluated: false,
      operand1Error: calc.operand1Error,
      operand2Error: false
    };
  }

  function isDigitKey(key) {
    return typeof key === "string" && key.length === 1 && key >= "0" && key <= "9";
  }

  function applyKeyPress(calculator, key, limits) {
    if (key === "C") {
      return resetCalculator(calculator);
    }
    if (key === "CE") {
      return pressClearEntry(calculator);
    }
    if (isDigitKey(key)) {
      return pressDigit(calculator, key, limits);
    }
    if (key === "+") {
      return pressPlus(calculator, limits);
    }
    if (key === "-") {
      return pressOperator(calculator, "-", limits);
    }
    if (key === "*") {
      return pressOperator(calculator, "*", limits);
    }
    if (key === "/") {
      return pressOperator(calculator, "/", limits);
    }
    if (key === "=") {
      return pressEquals(calculator, limits);
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
    if (operator === "+") {
      return true;
    }
    return !!unlockedOperators[operator];
  }

  function isUtilityUnlocked(unlockedUtilities, key) {
    return !!unlockedUtilities[key];
  }

  function canUseKey(state, key) {
    if (isDigitKey(key)) {
      return isDigitUnlocked(state.unlocked, key);
    }
    if (key === "+" || key === "-" || key === "*" || key === "/" || key === "=") {
      return isOperatorUnlocked(state.unlockedOperators, key);
    }
    if (key === "C" || key === "CE") {
      return isUtilityUnlocked(state.unlockedUtilities, key);
    }
    return false;
  }

  function applyConditionalUnlockRules(prevState, nextState, action) {
    var state = nextState;
    for (var i = 0; i < CONDITIONAL_UNLOCK_RULES.length; i += 1) {
      var rule = CONDITIONAL_UNLOCK_RULES[i];
      if (!rule.when(prevState, state, action)) {
        continue;
      }
      if (rule.utility && !state.unlockedUtilities[rule.utility]) {
        var nextUtilities = Object.assign({}, state.unlockedUtilities);
        nextUtilities[rule.utility] = true;
        state = {
          calculator: state.calculator,
          unlocked: state.unlocked,
          unlockedOperators: state.unlockedOperators,
          unlockedUtilities: nextUtilities,
          displayUnlocks: state.displayUnlocks,
          storeRevealed: state.storeRevealed
        };
      }
      if (rule.operator && !state.unlockedOperators[rule.operator]) {
        var nextOperators = Object.assign({}, state.unlockedOperators);
        nextOperators[rule.operator] = true;
        state = {
          calculator: state.calculator,
          unlocked: state.unlocked,
          unlockedOperators: nextOperators,
          unlockedUtilities: state.unlockedUtilities,
          displayUnlocks: state.displayUnlocks,
          storeRevealed: state.storeRevealed
        };
      }
    }
    return state;
  }

  function conditionalUnlocksChanged(prevState, nextState) {
    for (var i = 0; i < LOCKABLE_UTILITIES.length; i += 1) {
      var utility = LOCKABLE_UTILITIES[i];
      if (!!prevState.unlockedUtilities[utility] !== !!nextState.unlockedUtilities[utility]) {
        return true;
      }
    }
    for (var j = 0; j < LOCKABLE_OPERATORS.length; j += 1) {
      var operator = LOCKABLE_OPERATORS[j];
      if (!!prevState.unlockedOperators[operator] !== !!nextState.unlockedOperators[operator]) {
        return true;
      }
    }
    return false;
  }

  function didExecutePendingSubtraction(prevState, action) {
    if (action.type !== "PRESS_KEY") {
      return false;
    }
    if (prevState.calculator.pendingOp !== "-") {
      return false;
    }
    return action.key === "=" || action.key === "+" || action.key === "-" || action.key === "*" || action.key === "/";
  }

  function getSubtractionAmountFromState(state) {
    var raw = state.calculator.entry === "" ? "0" : state.calculator.entry;
    return tryToBigInt(raw);
  }

  function isStoreItemPurchased(state, item) {
    if (item.type === "digit") {
      return !!state.unlocked[item.target];
    }
    if (item.type === "operator") {
      return !!state.unlockedOperators[item.target];
    }
    if (item.type === "display_cap") {
      return state.displayUnlocks[item.target] >= DISPLAY_SLOTS;
    }
    return false;
  }

  function applyStoreItemPurchase(state, item) {
    if (item.type === "digit") {
      if (state.unlocked[item.target]) {
        return state;
      }
      var nextDigits = Object.assign({}, state.unlocked);
      nextDigits[item.target] = true;
      return {
        calculator: state.calculator,
        unlocked: nextDigits,
        unlockedOperators: state.unlockedOperators,
        unlockedUtilities: state.unlockedUtilities,
        displayUnlocks: state.displayUnlocks,
        storeRevealed: state.storeRevealed
      };
    }

    if (item.type === "operator") {
      if (state.unlockedOperators[item.target]) {
        return state;
      }
      var nextOperators = Object.assign({}, state.unlockedOperators);
      nextOperators[item.target] = true;
      return {
        calculator: state.calculator,
        unlocked: state.unlocked,
        unlockedOperators: nextOperators,
        unlockedUtilities: state.unlockedUtilities,
        displayUnlocks: state.displayUnlocks,
        storeRevealed: state.storeRevealed
      };
    }

    if (item.type === "display_cap") {
      if (state.displayUnlocks[item.target] >= DISPLAY_SLOTS) {
        return state;
      }
      var nextCaps = Object.assign({}, state.displayUnlocks);
      nextCaps[item.target] = nextCaps[item.target] + 1;
      return {
        calculator: state.calculator,
        unlocked: state.unlocked,
        unlockedOperators: state.unlockedOperators,
        unlockedUtilities: state.unlockedUtilities,
        displayUnlocks: nextCaps,
        storeRevealed: state.storeRevealed
      };
    }

    return state;
  }

  function applyStorePurchaseFromAmount(state, amount) {
    if (amount == null || amount <= 0n) {
      return state;
    }
    for (var i = 0; i < STORE_ITEMS.length; i += 1) {
      var item = STORE_ITEMS[i];
      if (item.price !== amount) {
        continue;
      }
      if (isStoreItemPurchased(state, item)) {
        return state;
      }
      return applyStoreItemPurchase(state, item);
    }
    return state;
  }

  function reduce(state, action) {
    if (action.type === "PRESS_KEY") {
      var key = action.key;
      if (!canUseKey(state, key)) {
        return state;
      }
      var nextCalculator = applyKeyPress(state.calculator, key, state.displayUnlocks);
      return {
        calculator: nextCalculator,
        unlocked: state.unlocked,
        unlockedOperators: state.unlockedOperators,
        unlockedUtilities: state.unlockedUtilities,
        displayUnlocks: state.displayUnlocks,
        storeRevealed: state.storeRevealed || key === "-"
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
        unlockedOperators: state.unlockedOperators,
        unlockedUtilities: state.unlockedUtilities,
        displayUnlocks: state.displayUnlocks,
        storeRevealed: state.storeRevealed
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
      var unlockedUtilitiesAll = createDefaultUtilityUnlocks();
      for (var k = 0; k < LOCKABLE_UTILITIES.length; k += 1) {
        unlockedUtilitiesAll[LOCKABLE_UTILITIES[k]] = true;
      }
      return {
        calculator: state.calculator,
        unlocked: unlockedAll,
        unlockedOperators: unlockedOpsAll,
        unlockedUtilities: unlockedUtilitiesAll,
        displayUnlocks: state.displayUnlocks,
        storeRevealed: state.storeRevealed
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
      unlockedUtilities: state.unlockedUtilities,
      displayUnlocks: state.displayUnlocks,
      storeRevealed: !!state.storeRevealed,
      calculator: {
        display: String(state.calculator.display),
        entry: String(state.calculator.entry),
        accumulator: state.calculator.accumulator == null ? null : state.calculator.accumulator.toString(),
        pendingOp: state.calculator.pendingOp,
        justEvaluated: !!state.calculator.justEvaluated,
        operand1Error: !!state.calculator.operand1Error,
        operand2Error: !!state.calculator.operand2Error
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

    var parsedUtilityUnlocks = createDefaultUtilityUnlocks();
    for (var k = 0; k < LOCKABLE_UTILITIES.length; k += 1) {
      var utility = LOCKABLE_UTILITIES[k];
      parsedUtilityUnlocks[utility] = !!(raw.unlockedUtilities && raw.unlockedUtilities[utility]);
    }

    var parsedDisplayUnlocks = {
      operand1Digits: Math.max(1, Math.min(DISPLAY_SLOTS, Number(raw.displayUnlocks && raw.displayUnlocks.operand1Digits) || 1)),
      operand2Digits: Math.max(1, Math.min(DISPLAY_SLOTS, Number(raw.displayUnlocks && raw.displayUnlocks.operand2Digits) || 1))
    };

    return {
      calculator: {
        display: String(raw.calculator && raw.calculator.display != null ? raw.calculator.display : "0"),
        entry: String(raw.calculator && raw.calculator.entry != null ? raw.calculator.entry : ""),
        accumulator: parseBigIntOrNull(raw.calculator ? raw.calculator.accumulator : null),
        pendingOp: raw.calculator ? raw.calculator.pendingOp : null,
        justEvaluated: !!(raw.calculator && raw.calculator.justEvaluated),
        operand1Error: !!(raw.calculator && raw.calculator.operand1Error),
        operand2Error: !!(raw.calculator && raw.calculator.operand2Error)
      },
      unlocked: parsedUnlocks,
      unlockedOperators: parsedOperatorUnlocks,
      unlockedUtilities: parsedUtilityUnlocks,
      displayUnlocks: parsedDisplayUnlocks,
      storeRevealed: !!raw.storeRevealed
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

  function renderLcd(charNodes, value, visibleDigits) {
    var totalSlots = charNodes.length;
    var unlockedSlots =
      visibleDigits == null ? totalSlots : Math.max(1, Math.min(totalSlots, Number(visibleDigits) || 1));
    var hiddenSlots = totalSlots - unlockedSlots;

    var trimmed = String(value);
    if (/^err(or)?$/i.test(trimmed)) {
      trimmed = "Error".slice(0, Math.min(unlockedSlots, 5));
    } else if (trimmed.length > unlockedSlots) {
      trimmed = trimmed.slice(trimmed.length - unlockedSlots);
    }

    var padding = unlockedSlots - trimmed.length;
    for (var i = 0; i < charNodes.length; i += 1) {
      var slot = charNodes[i].parentElement;
      var isLockedSlot = i < hiddenSlots;
      slot.classList.toggle("locked-digit", isLockedSlot);

      if (isLockedSlot) {
        charNodes[i].textContent = " ";
        slot.classList.add("blank");
        continue;
      }

      var indexInVisible = i - hiddenSlots;
      var isBlank = indexInVisible < padding;
      var character = isBlank ? " " : trimmed.charAt(indexInVisible - padding);
      charNodes[i].textContent = character;
      slot.classList.toggle("blank", isBlank);
    }
  }

  function getStoreItemStatus(state, item) {
    if (item.type === "digit") {
      return {
        checked: !!state.unlocked[item.target],
        text: ""
      };
    }
    if (item.type === "operator") {
      return {
        checked: !!state.unlockedOperators[item.target],
        text: ""
      };
    }
    if (item.type === "display_cap") {
      var current = state.displayUnlocks[item.target];
      if (current >= DISPLAY_SLOTS) {
        return {
          checked: true,
          text: DISPLAY_SLOTS + "/" + DISPLAY_SLOTS
        };
      }
      return {
        checked: false,
        text: current + "/" + DISPLAY_SLOTS
      };
    }
    return {
      checked: false,
      text: ""
    };
  }

  function getDigitPlaceName(index) {
    var names = [
      "",
      "Ones",
      "Tens",
      "Hundreds",
      "Thousands",
      "Ten-thousands",
      "Hundred-thousands",
      "Millions",
      "Ten-millions",
      "Hundred-millions",
      "Billions",
      "Ten-billions",
      "Hundred-billions"
    ];
    return names[index] || "Digit " + index;
  }

  function getStoreItemLabel(state, item) {
    if (item.type !== "display_cap") {
      return item.label;
    }
    var current = state.displayUnlocks[item.target];
    if (current >= DISPLAY_SLOTS) {
      return item.target === "operand1Digits" ? "Operand 1 maxed" : "Operand 2 maxed";
    }
    var nextPlace = getDigitPlaceName(current + 1);
    var operandPrefix = item.target === "operand1Digits" ? "Operand 1" : "Operand 2";
    return operandPrefix + ": " + nextPlace + " digit";
  }

  function renderStoreList(state, nodes) {
    var items = [];
    for (var i = 0; i < STORE_ITEMS.length; i += 1) {
      var item = STORE_ITEMS[i];
      var status = getStoreItemStatus(state, item);
      var label = getStoreItemLabel(state, item);
      var checkClass = status.checked ? "on" : "off";
      var checkMark = status.checked ? "&#10003;" : "&nbsp;";
      var statusText = status.text ? '<span class="store-state-text">' + status.text + "</span>" : "";
      var line =
        "<tr>" +
        '<td class="col-price">-' +
        item.price.toString() +
        "</td>" +
        '<td class="col-item">' +
        label +
        "</td>" +
        '<td class="col-state"><span class="store-check ' +
        checkClass +
        '">' +
        checkMark +
        "</span>" +
        statusText +
        "</td>" +
        "</tr>";
      items.push(line);
    }
    nodes.storeList.innerHTML = items.join("");
  }

  function getNewlyUnlockedControls(prevState, nextState) {
    var unlocked = [];

    for (var i = 0; i < LOCKABLE_DIGITS.length; i += 1) {
      var digit = LOCKABLE_DIGITS[i];
      if (!prevState.unlocked[digit] && nextState.unlocked[digit]) {
        unlocked.push({ type: "digit", key: digit });
      }
    }

    for (var j = 0; j < LOCKABLE_OPERATORS.length; j += 1) {
      var operator = LOCKABLE_OPERATORS[j];
      if (!prevState.unlockedOperators[operator] && nextState.unlockedOperators[operator]) {
        unlocked.push({ type: "operator", key: operator });
      }
    }

    for (var k = 0; k < LOCKABLE_UTILITIES.length; k += 1) {
      var utility = LOCKABLE_UTILITIES[k];
      if (!prevState.unlockedUtilities[utility] && nextState.unlockedUtilities[utility]) {
        unlocked.push({ type: "utility", key: utility });
      }
    }

    return unlocked;
  }

  function getControlButton(nodes, control) {
    if (control.type === "digit") {
      return nodes.keyButtons[control.key] || null;
    }
    if (control.type === "operator") {
      return nodes.operatorKeyButtons[control.key] || null;
    }
    if (control.type === "utility") {
      return nodes.utilityButtons[control.key] || null;
    }
    return null;
  }

  function triggerUnlockAnimations(nodes, controls) {
    for (var i = 0; i < controls.length; i += 1) {
      var button = getControlButton(nodes, controls[i]);
      if (!button) {
        continue;
      }
      button.classList.remove("unlock-flash");
      void button.offsetWidth;
      button.classList.add("unlock-flash");
    }
  }

  function render(state, nodes) {
    renderLcd(nodes.displayChars, state.calculator.display, state.displayUnlocks.operand1Digits);
    renderLcd(
      nodes.secondaryDisplayChars,
      state.calculator.pendingOp
        ? state.calculator.operand2Error
          ? "Err"
          : state.calculator.entry === ""
            ? "0"
            : state.calculator.entry
        : "",
      state.displayUnlocks.operand2Digits
    );
    nodes.secondaryOp.textContent = state.calculator.pendingOp ? state.calculator.pendingOp : "";
    nodes.unlockWindow.classList.toggle("hidden", !state.storeRevealed);

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

    for (var p = 0; p < LOCKABLE_UTILITIES.length; p += 1) {
      var utilityKey = LOCKABLE_UTILITIES[p];
      var utilityButton = nodes.utilityButtons[utilityKey];
      if (utilityButton) {
        setButtonState(utilityButton, !!state.unlockedUtilities[utilityKey]);
      }
    }
    renderStoreList(state, nodes);
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

  function collectUtilityButtons() {
    var utilityButtons = {};
    var allKeyButtons = document.querySelectorAll("[data-key]");
    for (var i = 0; i < allKeyButtons.length; i += 1) {
      var button = allKeyButtons[i];
      var key = button.dataset.key;
      if (LOCKABLE_UTILITIES.indexOf(key) !== -1) {
        utilityButtons[key] = button;
      }
    }
    return utilityButtons;
  }

  var nodes = {
    display: document.getElementById("display"),
    secondaryDisplay: document.getElementById("secondary-display"),
    secondaryOp: document.getElementById("secondary-op"),
    unlockWindow: document.getElementById("unlock-window"),
    storeList: document.getElementById("store-list"),
    keyButtons: collectKeyButtons(),
    operatorKeyButtons: collectOperatorKeyButtons(),
    utilityButtons: collectUtilityButtons()
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

    var prevState = state;
    var reducedState = reduce(state, action);
    var afterStoreState = reducedState;
    if (
      didExecutePendingSubtraction(state, action) &&
      !reducedState.calculator.operand1Error &&
      !reducedState.calculator.operand2Error
    ) {
      var subtractionAmount = getSubtractionAmountFromState(state);
      afterStoreState = applyStorePurchaseFromAmount(reducedState, subtractionAmount);
    }

    var didStorePurchase = afterStoreState !== reducedState;
    var nextState = applyConditionalUnlockRules(state, afterStoreState, action);
    var didAutoUnlockFromRule = conditionalUnlocksChanged(state, nextState);
    var newlyUnlockedControls = getNewlyUnlockedControls(prevState, nextState);
    if (nextState !== state) {
      state = nextState;
      isDirty = true;
      render(state, nodes);
      if (newlyUnlockedControls.length > 0) {
        triggerUnlockAnimations(nodes, newlyUnlockedControls);
      }
    }

    if (
      action.type === "DEBUG_UNLOCK_DIGIT" ||
      action.type === "DEBUG_UNLOCK_ALL" ||
      (action.type === "PRESS_KEY" && (action.key === "C" || action.key === "CE")) ||
      didStorePurchase ||
      didAutoUnlockFromRule
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
