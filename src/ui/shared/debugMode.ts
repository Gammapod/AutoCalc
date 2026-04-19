export const isDebugMenuOpen = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.getAttribute("data-debug-menu-open") === "true";
};
