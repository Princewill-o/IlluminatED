export const LEVEL_OPTIONS = [
  { id: "gcse", label: "GCSE" },
  { id: "alevel", label: "A level" },
  { id: "btec", label: "BTEC" },
  { id: "tlevel", label: "T Level" },
  { id: "level23", label: "Other Level 2 or 3" },
  { id: "other", label: "Other" },
] as const;

export const DBS_OPTIONS = [
  {
    id: "enhanced-update-service",
    label: "Enhanced DBS on the Update Service",
  },
  { id: "enhanced", label: "Enhanced DBS (not on Update Service)" },
  { id: "none", label: "None yet" },
] as const;

export const levelLabel = (id: string) =>
  LEVEL_OPTIONS.find((l) => l.id === id)?.label ?? id;
export const dbsLabel = (id: string) =>
  DBS_OPTIONS.find((d) => d.id === id)?.label ?? id;
