export type MigrationVersionHandler<TState, TResult> = {
  version: number;
  run: (state: TState) => TResult | null;
};

export const findVersionHandler = <TState, TResult>(
  version: number,
  handlers: MigrationVersionHandler<TState, TResult>[],
): MigrationVersionHandler<TState, TResult> | null =>
  handlers.find((handler) => handler.version === version) ?? null;

export const runVersionHandler = <TState, TResult>(
  version: number,
  state: TState,
  handlers: MigrationVersionHandler<TState, TResult>[],
): TResult | null => {
  const handler = findVersionHandler(version, handlers);
  if (!handler) {
    return null;
  }
  return handler.run(state);
};
