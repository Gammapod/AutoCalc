import { APP_VERSION } from "../../generated/appVersion.js";

export const normalizeVersionToken = (versionToken: string): string =>
  versionToken.startsWith("v") ? versionToken : `v${versionToken}`;

type EnvLike = Record<string, unknown> | undefined;

export const resolveAppVersionToken = (env?: EnvLike): string => {
  const importMetaVersion = env?.APP_VERSION;
  if (typeof importMetaVersion === "string" && importMetaVersion.trim()) {
    return importMetaVersion.trim();
  }
  const processVersion = env?.npm_package_version;
  if (typeof processVersion === "string" && processVersion.trim()) {
    return processVersion.trim();
  }
  return APP_VERSION;
};

export const resolveNormalizedAppVersionToken = (env?: EnvLike): string =>
  normalizeVersionToken(resolveAppVersionToken(env));

export const resolveAppVersionFromDocument = (): string => {
  if (typeof document === "undefined") {
    return resolveNormalizedAppVersionToken();
  }
  const versionToken = document.body.dataset.appVersion?.trim();
  if (!versionToken) {
    return resolveNormalizedAppVersionToken();
  }
  return normalizeVersionToken(versionToken);
};
