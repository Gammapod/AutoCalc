import type { SnapId } from "../shellModel.js";
import type { ShellRefs } from "./types.js";

export const getOffsetInTrack = (target: HTMLElement, track: HTMLElement): number => {
  const targetRect = target.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();
  return targetRect.top - trackRect.top;
};

export const getSnapOffset = (snapId: SnapId, refs: ShellRefs): number => {
  if (snapId === "middle") {
    return getOffsetInTrack(refs.sectionCalc, refs.track);
  }
  return getOffsetInTrack(refs.keys, refs.track);
};
