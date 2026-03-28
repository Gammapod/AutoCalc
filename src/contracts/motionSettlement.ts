export type MotionSettlementService = {
  awaitMotionSettled: (tokenOrChannel?: string) => Promise<void>;
};
