import { getButtonDefinition } from "../../domain/buttonRegistry.js";
import { KEY_ID, resolveKeyId } from "../../domain/keyPresentation.js";
import type { Key } from "../../domain/types.js";

export const applySharedKeyButtonClasses = (
  button: HTMLButtonElement,
  options: {
    key: Key;
    visualGroup: string;
    isUnlocked?: boolean;
    newlyUnlockedKeys?: ReadonlySet<string>;
  },
): void => {
  button.classList.add(`key--group-${options.visualGroup}`);
  if (options.key === KEY_ID.const_bottom) {
    button.classList.add("key--value-bottom");
  }

  const buttonDefinition = getButtonDefinition(resolveKeyId(options.key));
  if (buttonDefinition?.unlockGroup === "unaryOperators") {
    button.classList.add("key--unary-operator");
  }
  if (buttonDefinition?.traits.includes("complex_family")) {
    button.classList.add("key--family-complex");
  }
  if (options.isUnlocked && options.newlyUnlockedKeys?.has(options.key)) {
    button.classList.add("key--unlock-animate");
  }
};
