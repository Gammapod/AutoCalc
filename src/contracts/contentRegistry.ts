import type { ContentProvider } from "./contentProvider.js";

let currentProvider: ContentProvider | null = null;

export const setContentProvider = (provider: ContentProvider): void => {
  currentProvider = provider;
};

export const getContentProvider = (): ContentProvider => {
  if (!currentProvider) {
    throw new Error("Content provider not configured. Call setContentProvider() in the composition root before use.");
  }
  return currentProvider;
};

export const clearContentProviderForTests = (): void => {
  currentProvider = null;
};
