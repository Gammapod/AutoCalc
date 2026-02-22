(function () {
  var SAVE_VERSION = 1;
  var SAVE_KEY = "autocalc.v0_1.save";
  var UNLOCK_COST_DIGIT_2 = 25n;
  var AUTOSAVE_INTERVAL_MS = 5000;
  var DISPLAY_SLOTS = 12;

  function createInitialState() {
    return {
      calculator: {
        display: "0",
        entry: "",
        accumulator: null,
        pendingOp: null,
        justEvaluated: false
      },
      unlocked: {
        digit2: false
      }
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
    if (calc.justEvaluated && calc.pendingOp == null) {
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
    var entryValue = toBigInt(calc.entry || calc.display);
    if (calc.pendingOp === "+") {
      var sum = toBigInt(calc.accumulator) + toBigInt(calc.entry);
      return {
        display: sum.toString(),
        entry: "",
        accumulator: sum,
        pendingOp: "+",
        justEvaluated: false
      };
    }
    return {
      display: entryValue.toString(),
      entry: "",
      accumulator: entryValue,
      pendingOp: "+",
      justEvaluated: false
    };
  }

  function pressEquals(calc) {
    var result = toBigInt(calc.entry || calc.display);
    if (calc.pendingOp === "+") {
      var left = toBigInt(calc.accumulator);
      var right = calc.entry === "" ? 0n : toBigInt(calc.entry);
      result = left + right;
    }
    return {
      calculator: {
        display: result.toString(),
        entry: "",
        accumulator: null,
        pendingOp: null,
        justEvaluated: true
      },
      result: result
    };
  }

  function applyKeyPress(calculator, key) {
    if (key === "C") {
      return resetCalculator(calculator);
    }
    if (key === "1" || key === "2") {
      return pressDigit(calculator, key);
    }
    if (key === "+") {
      return pressPlus(calculator);
    }
    if (key === "=") {
      var next = pressEquals(calculator);
      return next.calculator;
    }
    return calculator;
  }

  function canUseKey(state, key) {
    if (key === "2" && !state.unlocked.digit2) {
      return false;
    }
    return key === "1" || key === "2" || key === "+" || key === "C";
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
        unlocked: state.unlocked
      };
    }

    if (action.type === "BUY_UNLOCK_2") {
      var currentValue = toBigInt(state.calculator.display);
      if (state.unlocked.digit2 || currentValue < UNLOCK_COST_DIGIT_2) {
        return state;
      }
      var remaining = currentValue - UNLOCK_COST_DIGIT_2;
      return {
        calculator: {
          display: remaining.toString(),
          entry: "",
          accumulator: null,
          pendingOp: null,
          justEvaluated: true
        },
        unlocked: { digit2: true }
      };
    }

    if (action.type === "DEBUG_UNLOCK_2") {
      return {
        calculator: state.calculator,
        unlocked: { digit2: true }
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
      unlocked: {
        digit2: !!state.unlocked.digit2
      },
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
    return {
      calculator: {
        display: String(raw.calculator && raw.calculator.display != null ? raw.calculator.display : "0"),
        entry: String(raw.calculator && raw.calculator.entry != null ? raw.calculator.entry : ""),
        accumulator: parseBigIntOrNull(raw.calculator ? raw.calculator.accumulator : null),
        pendingOp: raw.calculator ? raw.calculator.pendingOp : null,
        justEvaluated: !!(raw.calculator && raw.calculator.justEvaluated)
      },
      unlocked: {
        digit2: !!(raw.unlocked && raw.unlocked.digit2)
      }
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
      button.classList.remove("locked");
    } else {
      button.classList.add("locked");
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

    setButtonState(nodes.key2, state.unlocked.digit2);

    if (state.unlocked.digit2) {
      nodes.buy2.disabled = true;
      nodes.buy2.textContent = "2 unlocked";
    } else {
      var canAfford = toBigInt(state.calculator.display) >= UNLOCK_COST_DIGIT_2;
      nodes.buy2.disabled = !canAfford;
      nodes.buy2.textContent = "Unlock 2 (cost: " + UNLOCK_COST_DIGIT_2.toString() + ")";
    }
  }

  var nodes = {
    display: document.getElementById("display"),
    secondaryDisplay: document.getElementById("secondary-display"),
    secondaryOp: document.getElementById("secondary-op"),
    key2: document.getElementById("key-2"),
    buy2: document.getElementById("buy-2")
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
      action.type === "BUY_UNLOCK_2" ||
      action.type === "DEBUG_UNLOCK_2" ||
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

    if (target.id === "buy-2") {
      dispatch({ type: "BUY_UNLOCK_2" });
      return;
    }

    if (target.id === "debug-unlock-2") {
      dispatch({ type: "DEBUG_UNLOCK_2" });
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
