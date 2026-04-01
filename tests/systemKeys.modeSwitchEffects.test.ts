import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { initialState } from "../src/domain/state.js";
import { k } from "./support/keyCompat.js";

export const runSystemKeysModeSwitchEffectsTests = (): void => {
  const base = initialState();
  const withUtilityUnlocked = (state: ReturnType<typeof initialState>, key: ReturnType<typeof k>): ReturnType<typeof initialState> => ({
    ...state,
    unlocks: {
      ...state.unlocks,
      utilities: {
        ...state.unlocks.utilities,
        [key]: true,
      },
    },
  });

  const cases: Array<{ key: ReturnType<typeof k>; expected: ReturnType<typeof executeCommand>["uiEffects"][number] }> = [
    {
      key: k("system_save_quit_main_menu"),
      expected: { type: "request_mode_transition", targetMode: "main_menu", savePolicy: "save_current" },
    },
    {
      key: k("system_mode_game"),
      expected: { type: "request_mode_transition", targetMode: "game", savePolicy: "none" },
    },
    {
      key: k("system_new_game"),
      expected: { type: "request_mode_transition", targetMode: "game", savePolicy: "clear_save" },
    },
    {
      key: k("system_mode_sandbox"),
      expected: { type: "request_mode_transition", targetMode: "sandbox", savePolicy: "none" },
    },
    {
      key: k("system_quit_game"),
      expected: { type: "quit_application" },
    },
  ];

  for (const testCase of cases) {
    const result = executeCommand(withUtilityUnlocked(base, testCase.key), {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: testCase.key },
    });
    assert.ok(
      result.uiEffects.some((effect) => JSON.stringify(effect) === JSON.stringify(testCase.expected)),
      `${testCase.key} emits canonical system intent effect`,
    );
    assert.ok(
      result.uiEffects.some(
        (effect) => effect.type === "input_feedback" && effect.outcome === "accepted",
      ),
      `${testCase.key} emits accepted input feedback`,
    );
  }
};
