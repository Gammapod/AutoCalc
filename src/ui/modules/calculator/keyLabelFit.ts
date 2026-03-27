import { getCalculatorModuleState } from "./runtime.js";

const KEY_LABEL_INLINE_GUTTER_PX = 6;
const KEY_LABEL_SQUISH_THRESHOLD_PX = 2;

export const setKeyButtonLabel = (button: HTMLButtonElement, label: string): void => {
  button.textContent = "";
  const labelEl = document.createElement("span");
  labelEl.className = "key__label";
  labelEl.textContent = label;
  button.appendChild(labelEl);
};

const fitKeyButtonLabel = (button: HTMLButtonElement): void => {
  const labelEl = button.querySelector<HTMLElement>(".key__label");
  if (!labelEl) {
    return;
  }
  labelEl.style.transform = "scaleX(1)";
  const computed = window.getComputedStyle(button);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const contentWidth = button.clientWidth - paddingLeft - paddingRight;
  const availableWidth = Math.max(1, contentWidth - KEY_LABEL_INLINE_GUTTER_PX * 2);
  const measuredWidth = labelEl.getBoundingClientRect().width;
  const naturalWidth = Math.max(1, Math.ceil(measuredWidth || labelEl.scrollWidth));
  if (naturalWidth <= availableWidth + KEY_LABEL_SQUISH_THRESHOLD_PX) {
    return;
  }
  const scale = Math.max(0.01, availableWidth / naturalWidth);
  labelEl.style.transform = `scaleX(${scale.toFixed(4)})`;
};

export const fitKeyLabelsInContainer = (container: ParentNode): void => {
  const buttons = container.querySelectorAll<HTMLButtonElement>(".key");
  buttons.forEach((button) => fitKeyButtonLabel(button));
};

const refitAllVisibleKeyLabels = (root: Element): void => {
  const keypad = root.querySelector<HTMLElement>("[data-keys]");
  if (keypad) {
    fitKeyLabelsInContainer(keypad);
  }
  const storage = root.querySelector<HTMLElement>("[data-storage-keys]");
  if (storage) {
    fitKeyLabelsInContainer(storage);
  }
};

export const ensureKeyLabelResizeListener = (root: Element): void => {
  const calculatorState = getCalculatorModuleState(root);
  if (calculatorState.keyLabelResizeBound) {
    return;
  }
  calculatorState.keyLabelResizeBound = true;
  window.addEventListener("resize", () => {
    refitAllVisibleKeyLabels(root);
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refitAllVisibleKeyLabels(root);
    });
  });
  const fontSet = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fontSet?.ready) {
    fontSet.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refitAllVisibleKeyLabels(root);
        });
      });
    }).catch(() => {
      // Ignore font-ready failures; labels are still refit on resize and render.
    });
  }
};
