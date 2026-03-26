export type ReleaseNoteChannel = "planned" | "released";

export type ReleaseNoteEntry = {
  id: string;
  releaseVersion: string;
  channel: ReleaseNoteChannel;
  title: string;
  summary: string;
  bullets: string[];
};

export type ReleaseNotesCatalog = {
  entries: ReleaseNoteEntry[];
};
