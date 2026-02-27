export const toMermaidNodeId = (unlockId) => {
  const normalized = unlockId.replace(/[^A-Za-z0-9_]/g, "_");
  return normalized.match(/^[A-Za-z]/) ? `U_${normalized}` : `U_unlock_${normalized}`;
};
