export type ThemeMode = "dark" | "light";

export interface ThemePalette {
  mode: ThemeMode;
  bg: string;
  surface: string;
  elevated: string;
  recessed: string;
  hairline: string;
  hairlineStrong: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  accent: string;
  accentWarm: string;
  accentInk: string;
  tabGlassBg: string;
  tabGlassBorder: string;
  backdrop: string;
  emerald: string;
  emeraldBg: string;
  emeraldBorder: string;
  amber: string;
  crimson: string;
  crimsonBg: string;
  crimsonBorder: string;
}

export const DARK_THEME: ThemePalette = {
  mode: "dark",
  bg: "#090A0D",
  surface: "#111318",
  elevated: "#181B22",
  recessed: "#0C0D12",
  hairline: "#222631",
  hairlineStrong: "#313746",
  ink: "#F4F4F6",
  inkMuted: "#9499A6",
  inkSubtle: "#5E6473",
  accent: "#D4B483",
  accentWarm: "#D4B483",
  accentInk: "#090A0D",
  tabGlassBg: "rgba(17, 19, 24, 0.82)",
  tabGlassBorder: "rgba(255, 255, 255, 0.12)",
  backdrop: "rgba(0, 0, 0, 0.78)",
  emerald: "#34D399",
  emeraldBg: "#0E1A16",
  emeraldBorder: "#1E3F33",
  amber: "#EAB308",
  crimson: "#F87171",
  crimsonBg: "#1A1013",
  crimsonBorder: "#4C1D24",
};

export const LIGHT_THEME: ThemePalette = {
  mode: "light",
  bg: "#EDE7DC",
  surface: "#F5F1E8",
  elevated: "#FAF7F1",
  recessed: "#E2DACB",
  hairline: "#D4CAB8",
  hairlineStrong: "#BCAE98",
  ink: "#1F283B",
  inkMuted: "#4F5A70",
  inkSubtle: "#7A7367",
  accent: "#232E47",
  accentWarm: "#8E6E42",
  accentInk: "#F5F1E8",
  tabGlassBg: "rgba(245, 241, 232, 0.86)",
  tabGlassBorder: "rgba(31, 40, 59, 0.14)",
  backdrop: "rgba(22, 28, 42, 0.45)",
  emerald: "#1E6B52",
  emeraldBg: "#E3EDE8",
  emeraldBorder: "#B4CFC3",
  amber: "#9A5B13",
  crimson: "#9B2C2C",
  crimsonBg: "#F5E4E4",
  crimsonBorder: "#DFB8B8",
};

// Backwards-compatible alias for static defaults
export const THEME = DARK_THEME;
