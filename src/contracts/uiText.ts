export type UiText = {
  switches: {
    desktop: string;
    mobile: string;
    sandbox: string;
    game: string;
  };
  analysis: {
    title: string;
    reasoning: string;
    unlockSpec: string;
    scopeCompare: string;
  };
  checklist: {
    title: string;
    headerHint: string;
    headerReward: string;
    emptyAttemptable: string;
    quickstartTitle: string;
    quickstartItems: {
      unlockKeys: string;
      debugPanel: string;
      dragDrop: string;
      allocatorIntro: string;
      allocatorItems: string[];
    };
  };
};
