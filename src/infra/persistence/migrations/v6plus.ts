import { runVersionHandler, type MigrationVersionHandler } from "./registry.js";
import type {
  SerializableStateV6,
  SerializableStateV7,
  SerializableStateV8,
  SerializableStateV9,
  SerializableStateV10,
  SerializableStateV11,
  SerializableStateV12,
  SerializableStateV13,
  SerializableStateV14,
} from "../migrations.core.js";

export type SerializableStateV6Plus =
  | SerializableStateV6
  | SerializableStateV7
  | SerializableStateV8
  | SerializableStateV9
  | SerializableStateV10
  | SerializableStateV11
  | SerializableStateV12
  | SerializableStateV13
  | SerializableStateV14;

export type V6PlusMigrationContext = {
  isObject: (value: unknown) => value is Record<string, unknown>;
  normalizeCommonStateFields: <T extends { unlocks?: unknown; keyPressCounts?: unknown; completedUnlockIds?: unknown }>(
    state: T,
  ) => T & { unlocks: SerializableStateV6["unlocks"]; keyPressCounts: SerializableStateV6["keyPressCounts"]; completedUnlockIds: string[] };
  normalizeLegacyUiBase: <T extends { keyLayout?: unknown; storageLayout?: unknown; buttonFlags?: unknown }>(
    ui: T | undefined,
  ) => T & {
    keyLayout: SerializableStateV10["ui"]["keyLayout"];
    storageLayout: SerializableStateV10["ui"]["storageLayout"];
    buttonFlags: SerializableStateV10["ui"]["buttonFlags"];
  };
  normalizeLegacyUiWithVisualizer: <T extends { activeVisualizer?: unknown; memoryVariable?: unknown; keyLayout?: unknown; storageLayout?: unknown; buttonFlags?: unknown }>(
    ui: T | undefined,
  ) => T & {
    keyLayout: SerializableStateV10["ui"]["keyLayout"];
    storageLayout: SerializableStateV10["ui"]["storageLayout"];
    buttonFlags: SerializableStateV10["ui"]["buttonFlags"];
    activeVisualizer: SerializableStateV11["ui"]["activeVisualizer"];
    memoryVariable: NonNullable<SerializableStateV11["ui"]["memoryVariable"]>;
  };
  normalizeCalculatorRollErrors: <T extends { rollErrors?: unknown }>(
    calculator: T,
  ) => T & { rollErrors: SerializableStateV7["calculator"]["rollErrors"] };
  normalizeAllocatorPressCounts: (state: {
    allocatorReturnPressCount?: unknown;
    allocatorAllocatePressCount?: unknown;
  }) => { allocatorReturnPressCount: number; allocatorAllocatePressCount: number };
  normalizeCurrentCalculator: <T extends { seedSnapshot?: unknown; rollEntries?: unknown }>(
    calculator: T,
  ) => T & { rollEntries: SerializableStateV13["calculator"]["rollEntries"] };
  normalizeAllocatorV8: (source: unknown) => SerializableStateV8["allocator"];
  normalizeAllocatorV9: (source: unknown) => SerializableStateV9["allocator"];
  normalizeAllocatorV10: (source: unknown) => SerializableStateV10["allocator"];
  validateSerializableStateV6: (state: unknown) => state is SerializableStateV6;
  validateSerializableStateV7: (state: unknown) => state is SerializableStateV7;
  validateSerializableStateV8: (state: unknown) => state is SerializableStateV8;
  validateSerializableStateV9: (state: unknown) => state is SerializableStateV9;
  validateSerializableStateV10: (state: unknown) => state is SerializableStateV10;
  validateSerializableStateV11: (state: unknown) => state is SerializableStateV11;
  validateSerializableStateV12: (state: unknown) => state is SerializableStateV12;
  validateSerializableStateV13: (state: unknown) => state is SerializableStateV13;
  validateSerializableStateV14: (state: unknown) => state is SerializableStateV14;
  migrateChain: {
    fromV6: (value: SerializableStateV6) => SerializableStateV14;
    fromV7: (value: SerializableStateV7) => SerializableStateV14;
    fromV8: (value: SerializableStateV8) => SerializableStateV14;
    fromV9: (value: SerializableStateV9) => SerializableStateV14;
    fromV10: (value: SerializableStateV10) => SerializableStateV14;
    fromV11: (value: SerializableStateV11) => SerializableStateV14;
    fromV12: (value: SerializableStateV12) => SerializableStateV14;
    fromV13: (value: SerializableStateV13) => SerializableStateV14;
  };
};

const buildV6PlusHandlers = (
  context: V6PlusMigrationContext,
): MigrationVersionHandler<Record<string, unknown>, SerializableStateV14>[] => ([
  {
    version: 6,
    run: (state) => {
      const asV6 = state as SerializableStateV6;
      const normalizedV6: SerializableStateV6 = {
        ...context.normalizeCommonStateFields(asV6),
        ui: context.normalizeLegacyUiBase(asV6.ui),
      };
      if (!context.validateSerializableStateV6(normalizedV6)) {
        return null;
      }
      return context.migrateChain.fromV6(normalizedV6);
    },
  },
  {
    version: 7,
    run: (state) => {
      const asV7 = state as SerializableStateV7;
      const normalizedV7: SerializableStateV7 = {
        ...context.normalizeCommonStateFields(asV7),
        calculator: context.normalizeCalculatorRollErrors(asV7.calculator),
        ui: context.normalizeLegacyUiBase(asV7.ui),
      };
      return context.validateSerializableStateV7(normalizedV7) ? context.migrateChain.fromV7(normalizedV7) : null;
    },
  },
  {
    version: 8,
    run: (state) => {
      const asV8 = state as SerializableStateV8;
      const normalizedV8: SerializableStateV8 = {
        ...context.normalizeCommonStateFields(asV8),
        calculator: context.normalizeCalculatorRollErrors(asV8.calculator),
        ui: context.normalizeLegacyUiBase(asV8.ui),
        allocator: context.normalizeAllocatorV8(asV8.allocator),
      };
      return context.validateSerializableStateV8(normalizedV8) ? context.migrateChain.fromV8(normalizedV8) : null;
    },
  },
  {
    version: 9,
    run: (state) => {
      const asV9 = state as SerializableStateV9;
      const normalizedV9: SerializableStateV9 = {
        ...context.normalizeCommonStateFields(asV9),
        calculator: context.normalizeCalculatorRollErrors(asV9.calculator),
        ui: context.normalizeLegacyUiBase(asV9.ui),
        allocator: context.normalizeAllocatorV9(asV9.allocator),
      };
      return context.validateSerializableStateV9(normalizedV9) ? context.migrateChain.fromV9(normalizedV9) : null;
    },
  },
  {
    version: 10,
    run: (state) => {
      const asV10 = state as SerializableStateV10;
      const normalizedV10: SerializableStateV10 = {
        ...context.normalizeCommonStateFields(asV10),
        ...context.normalizeAllocatorPressCounts(asV10),
        calculator: context.normalizeCalculatorRollErrors(asV10.calculator),
        ui: context.normalizeLegacyUiBase(asV10.ui),
        allocator: context.normalizeAllocatorV10(asV10.allocator),
      };
      return context.validateSerializableStateV10(normalizedV10) ? context.migrateChain.fromV10(normalizedV10) : null;
    },
  },
  {
    version: 11,
    run: (state) => {
      const asV11 = state as SerializableStateV11;
      const normalizedV11: SerializableStateV11 = {
        ...context.normalizeCommonStateFields(asV11),
        ...context.normalizeAllocatorPressCounts(asV11),
        calculator: context.normalizeCalculatorRollErrors(asV11.calculator),
        ui: context.normalizeLegacyUiWithVisualizer(asV11.ui),
        allocator: context.normalizeAllocatorV10(asV11.allocator),
      };
      return context.validateSerializableStateV11(normalizedV11) ? context.migrateChain.fromV11(normalizedV11) : null;
    },
  },
  {
    version: 12,
    run: (state) => {
      const asV12 = state as SerializableStateV12;
      const normalizedV12: SerializableStateV12 = {
        ...context.normalizeCommonStateFields(asV12),
        ...context.normalizeAllocatorPressCounts(asV12),
        calculator: context.normalizeCalculatorRollErrors(asV12.calculator),
        ui: context.normalizeLegacyUiWithVisualizer(asV12.ui),
        allocator: context.normalizeAllocatorV10(asV12.allocator),
      };
      return context.validateSerializableStateV12(normalizedV12) ? context.migrateChain.fromV12(normalizedV12) : null;
    },
  },
  {
    version: 13,
    run: (state) => {
      const asV13 = state as SerializableStateV13;
      const normalizedV13: SerializableStateV13 = {
        ...context.normalizeCommonStateFields(asV13),
        ...context.normalizeAllocatorPressCounts(asV13),
        calculator: context.normalizeCurrentCalculator(asV13.calculator),
        ui: context.normalizeLegacyUiWithVisualizer(asV13.ui),
        allocator: context.normalizeAllocatorV10(asV13.allocator),
      };
      return context.validateSerializableStateV13(normalizedV13) ? context.migrateChain.fromV13(normalizedV13) : null;
    },
  },
  {
    version: 14,
    run: (state) => {
      const asV14 = state as SerializableStateV14;
      const normalizedV14: SerializableStateV14 = {
        ...context.normalizeCommonStateFields(asV14),
        ...context.normalizeAllocatorPressCounts(asV14),
        calculator: context.normalizeCurrentCalculator(asV14.calculator),
        ui: context.normalizeLegacyUiWithVisualizer(asV14.ui),
        allocator: context.normalizeAllocatorV10(asV14.allocator),
      };
      return context.validateSerializableStateV14(normalizedV14) ? normalizedV14 : null;
    },
  },
]);

export const migrateV6PlusToLatest = (
  schemaVersion: number,
  state: unknown,
  context: V6PlusMigrationContext,
): SerializableStateV14 | null => {
  if (!context.isObject(state)) {
    return null;
  }
  const handlers = buildV6PlusHandlers(context);
  const normalizedVersion = schemaVersion >= 14 && schemaVersion <= 18 ? 14 : schemaVersion;
  return runVersionHandler(normalizedVersion, state, handlers);
};
