import type { ContentProvider } from "./contentProvider.js";

export type AppServices = {
  contentProvider: ContentProvider;
};

let currentServices: AppServices | null = null;

export const setAppServices = (services: AppServices): void => {
  currentServices = services;
};

export const getAppServices = (): AppServices => {
  if (!currentServices) {
    throw new Error("App services not configured. Call setAppServices() in the composition root before use.");
  }
  return currentServices;
};

export const clearAppServicesForTests = (): void => {
  currentServices = null;
};
