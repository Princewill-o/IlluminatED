export type OfficeTheme =
  | "technology"
  | "finance"
  | "creative"
  | "logistics"
  | "science"
  | "hospitality"
  | "retail";
const PALETTES = {
  technology: {
    floor: "#d4e1dc",
    alternate: "#c8d9d5",
    wall: "#e9f0e9",
    trim: "#47786c",
    room: "Prototype lab",
    lounge: "Ideas garden",
  },
  finance: {
    floor: "#d4c9b5",
    alternate: "#c9bca6",
    wall: "#eee6d5",
    trim: "#536b64",
    room: "Client suite",
    lounge: "Quiet reading room",
  },
  creative: {
    floor: "#e6d6ca",
    alternate: "#deccbf",
    wall: "#f2e7de",
    trim: "#ae746b",
    room: "Production studio",
    lounge: "Showcase lounge",
  },
  logistics: {
    floor: "#c5ccd0",
    alternate: "#b8c3c9",
    wall: "#e6eceb",
    trim: "#ba8549",
    room: "Dispatch control",
    lounge: "Route planning room",
  },
  science: {
    floor: "#d3e4e4",
    alternate: "#c6dada",
    wall: "#edf4ef",
    trim: "#5d9496",
    room: "Research laboratory",
    lounge: "Discovery library",
  },
  hospitality: {
    floor: "#e2c5a7",
    alternate: "#d7b796",
    wall: "#f6e8d4",
    trim: "#b76044",
    room: "Kitchen classroom",
    lounge: "Tasting room",
  },
  retail: {
    floor: "#d7d9cb",
    alternate: "#cbcebd",
    wall: "#edf0e4",
    trim: "#67856b",
    room: "Stock & displays",
    lounge: "Customer workshop",
  },
} as const;
export function officeSeed(id: string) {
  return Array.from(id).reduce(
    (n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0,
    0,
  );
}
export function officeDesign(id: string, sector = "") {
  const text = `${id} ${sector}`.toLowerCase(),
    seed = officeSeed(id);
  const theme: OfficeTheme = /pizza|hospitality|food|cafe/.test(text)
    ? "hospitality"
    : /finance|bank|barklay|account/.test(text)
      ? "finance"
      : /creative|media|film|design|netf|spotif|music/.test(text)
        ? "creative"
        : /logistic|transport|amazon|amazoom|delivery|manufact|airline/.test(
              text,
            )
          ? "logistics"
          : /health|science|research|medical|pharma/.test(text)
            ? "science"
            : /retail|tesco|fashion|shop/.test(text)
              ? "retail"
              : "technology";
  return { theme, seed, ...PALETTES[theme] };
}
