type MotionCycleEntry = {
  token: string;
  channel: string;
  resolve: () => void;
  promise: Promise<void>;
  timeoutId: ReturnType<typeof setTimeout> | null;
  settled: boolean;
};

let cycleSeq = 0;
const cycleByToken = new Map<string, MotionCycleEntry>();
const latestTokenByChannel = new Map<string, string>();

const settleEntry = (entry: MotionCycleEntry): void => {
  if (entry.settled) {
    return;
  }
  entry.settled = true;
  if (entry.timeoutId !== null) {
    globalThis.clearTimeout(entry.timeoutId);
  }
  entry.resolve();
};

export const beginMotionCycle = (channel: string, fallbackMs: number = 0): string => {
  const token = `${channel}:${(++cycleSeq).toString()}`;
  let resolvePromise: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  if (!resolvePromise) {
    throw new Error("Motion cycle could not initialize resolver.");
  }
  const entry: MotionCycleEntry = {
    token,
    channel,
    resolve: resolvePromise,
    promise,
    timeoutId: null,
    settled: false,
  };
  if (fallbackMs > 0) {
    entry.timeoutId = globalThis.setTimeout(() => {
      settleEntry(entry);
    }, fallbackMs);
  }
  cycleByToken.set(token, entry);
  latestTokenByChannel.set(channel, token);
  return token;
};

export const completeMotionCycle = (token: string): void => {
  const entry = cycleByToken.get(token);
  if (!entry) {
    return;
  }
  settleEntry(entry);
};

const awaitByToken = async (token: string): Promise<void> => {
  const entry = cycleByToken.get(token);
  if (!entry) {
    return;
  }
  try {
    await entry.promise;
  } finally {
    cycleByToken.delete(token);
    if (latestTokenByChannel.get(entry.channel) === token) {
      latestTokenByChannel.delete(entry.channel);
    }
  }
};

export const awaitMotionSettled = async (tokenOrChannel?: string): Promise<void> => {
  if (!tokenOrChannel) {
    return;
  }
  if (cycleByToken.has(tokenOrChannel)) {
    await awaitByToken(tokenOrChannel);
    return;
  }
  const latestToken = latestTokenByChannel.get(tokenOrChannel);
  if (!latestToken) {
    return;
  }
  await awaitByToken(latestToken);
};

export const resetMotionLifecycleBridgeForTests = (): void => {
  for (const entry of cycleByToken.values()) {
    if (entry.timeoutId !== null) {
      globalThis.clearTimeout(entry.timeoutId);
    }
  }
  cycleByToken.clear();
  latestTokenByChannel.clear();
  cycleSeq = 0;
};
