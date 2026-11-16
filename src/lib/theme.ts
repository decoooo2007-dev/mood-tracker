import type { MoodType } from "@/types/mood";

export type MoodButtonStyle = "hybrid" | "keycaps" | "orbs";
export type SpotlightStyle = "classic" | "accent";

export interface PaletteVariant {
  bgPrimary: string;
  bgStart: string;
  bgMid: string;
  bgEnd: string;
  blob1: string;
  blob2: string;
  blob3: string;
  accentFrom: string;
  accentVia: string;
  accentTo: string;
  accentSolid: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  spotPrism: string;
  cardBase: string;
  lightShadow?: string;
  chartStroke: string;
  chartDot: string;
}

export interface ThemePalette {
  id: number;
  nameEn: string;
  nameAr: string;
  swatch: string;
  dark: PaletteVariant;
  light: PaletteVariant;
}

export const DEFAULT_PALETTE_ID = 4; // Nile Sapphire x Gold
export const DEFAULT_MOOD_STYLE: MoodButtonStyle = "hybrid";
export const DEFAULT_SPOTLIGHT_STYLE: SpotlightStyle = "classic";

export const PALETTE_STORAGE_KEY = "moodflow-palette";
export const MOOD_STYLE_STORAGE_KEY = "moodflow-mood-style";
export const SPOTLIGHT_STORAGE_KEY = "moodflow-spotlight";
export const MOOD_REACTIVE_STORAGE_KEY = "moodflow-mood-reactive";

export const PALETTES: ThemePalette[] = [
  {
    id: 1,
    nameEn: "1. Amethyst × Rose × Sky",
    nameAr: "١. بنفسجي × وردي × سماوي",
    swatch: "linear-gradient(135deg, #7c3aed, #ec4899, #38bdf8)",
    dark: {
      bgPrimary: "#0A0914",
      bgStart: "#3b0764",
      bgMid: "#1e1b4b",
      bgEnd: "#0c4a6e",
      blob1: "rgba(168, 85, 247, 0.42)",
      blob2: "rgba(236, 72, 153, 0.30)",
      blob3: "rgba(56, 189, 248, 0.28)",
      accentFrom: "#a855f7",
      accentVia: "#ec4899",
      accentTo: "#38bdf8",
      accentSolid: "#a855f7",
      accentSoft: "rgba(168, 85, 247, 0.24)",
      accentBorder: "rgba(192, 132, 252, 0.44)",
      accentText: "#e9d5ff",
      spotPrism: "rgba(192, 132, 252, 0.24)",
      cardBase: "rgba(255, 255, 255, 0.065)",
      chartStroke: "#C084FC",
      chartDot: "#38BDF8",
    },
    light: {
      bgPrimary: "#F3EFFE",
      bgStart: "#ddd6fe",
      bgMid: "#fce7f3",
      bgEnd: "#e0f2fe",
      blob1: "rgba(139, 92, 246, 0.36)",
      blob2: "rgba(236, 72, 153, 0.26)",
      blob3: "rgba(14, 165, 233, 0.28)",
      accentFrom: "#7c3aed",
      accentVia: "#db2777",
      accentTo: "#0284c7",
      accentSolid: "#7c3aed",
      accentSoft: "rgba(124, 58, 237, 0.13)",
      accentBorder: "rgba(124, 58, 237, 0.32)",
      accentText: "#5b21b6",
      spotPrism: "rgba(168, 85, 247, 0.18)",
      cardBase: "rgba(255, 255, 255, 0.64)",
      lightShadow: "rgba(109, 40, 217, 0.14)",
      chartStroke: "#7C3AED",
      chartDot: "#0284C7",
    },
  },
  {
    id: 2,
    nameEn: "2. Borealis Emerald × Violet",
    nameAr: "٢. زمردي × فيروزي × بنفسجي",
    swatch: "linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)",
    dark: {
      bgPrimary: "#051116",
      bgStart: "#042f2e",
      bgMid: "#0f172a",
      bgEnd: "#2e1065",
      blob1: "rgba(16, 185, 129, 0.40)",
      blob2: "rgba(6, 182, 212, 0.32)",
      blob3: "rgba(139, 92, 246, 0.28)",
      accentFrom: "#10b981",
      accentVia: "#06b6d4",
      accentTo: "#8b5cf6",
      accentSolid: "#10b981",
      accentSoft: "rgba(16, 185, 129, 0.22)",
      accentBorder: "rgba(52, 211, 153, 0.44)",
      accentText: "#a7f3d0",
      spotPrism: "rgba(45, 212, 191, 0.22)",
      cardBase: "rgba(255, 255, 255, 0.06)",
      chartStroke: "#34D399",
      chartDot: "#A78BFA",
    },
    light: {
      bgPrimary: "#ECFDF7",
      bgStart: "#d1fae5",
      bgMid: "#e0f2fe",
      bgEnd: "#ede9fe",
      blob1: "rgba(16, 185, 129, 0.34)",
      blob2: "rgba(6, 182, 212, 0.28)",
      blob3: "rgba(139, 92, 246, 0.24)",
      accentFrom: "#059669",
      accentVia: "#0891b2",
      accentTo: "#7c3aed",
      accentSolid: "#059669",
      accentSoft: "rgba(5, 150, 105, 0.13)",
      accentBorder: "rgba(5, 150, 105, 0.32)",
      accentText: "#065f46",
      spotPrism: "rgba(16, 185, 129, 0.18)",
      cardBase: "rgba(255, 255, 255, 0.66)",
      lightShadow: "rgba(5, 150, 105, 0.13)",
      chartStroke: "#059669",
      chartDot: "#7C3AED",
    },
  },
  {
    id: 3,
    nameEn: "3. Velvet Dusk: Indigo × Amber",
    nameAr: "٣. نيلي × قرمزي × عنبر ذهبي",
    swatch: "linear-gradient(135deg, #4f46e5, #f43f5e, #f59e0b)",
    dark: {
      bgPrimary: "#110B14",
      bgStart: "#0f172a",
      bgMid: "#3b0764",
      bgEnd: "#431407",
      blob1: "rgba(99, 102, 241, 0.38)",
      blob2: "rgba(244, 63, 94, 0.32)",
      blob3: "rgba(245, 158, 11, 0.26)",
      accentFrom: "#6366f1",
      accentVia: "#f43f5e",
      accentTo: "#f59e0b",
      accentSolid: "#f43f5e",
      accentSoft: "rgba(244, 63, 94, 0.22)",
      accentBorder: "rgba(251, 113, 133, 0.44)",
      accentText: "#fecdd3",
      spotPrism: "rgba(251, 146, 60, 0.22)",
      cardBase: "rgba(255, 255, 255, 0.065)",
      chartStroke: "#FB7185",
      chartDot: "#FBBF24",
    },
    light: {
      bgPrimary: "#FFF5F7",
      bgStart: "#e0e7ff",
      bgMid: "#ffe4e6",
      bgEnd: "#fef3c7",
      blob1: "rgba(99, 102, 241, 0.28)",
      blob2: "rgba(244, 63, 94, 0.28)",
      blob3: "rgba(245, 158, 11, 0.26)",
      accentFrom: "#4f46e5",
      accentVia: "#e11d48",
      accentTo: "#d97706",
      accentSolid: "#e11d48",
      accentSoft: "rgba(225, 29, 72, 0.12)",
      accentBorder: "rgba(225, 29, 72, 0.3)",
      accentText: "#9f1239",
      spotPrism: "rgba(244, 63, 94, 0.16)",
      cardBase: "rgba(255, 255, 255, 0.68)",
      lightShadow: "rgba(225, 29, 72, 0.12)",
      chartStroke: "#E11D48",
      chartDot: "#D97706",
    },
  },
  {
    id: 4,
    nameEn: "4. Nile Sapphire × Gold",
    nameAr: "٤. ياقوت النيل × تركواز × ذهب",
    swatch: "linear-gradient(135deg, #2563eb, #14b8a6, #eab308)",
    dark: {
      bgPrimary: "#060C1A",
      bgStart: "#070d1f",
      bgMid: "#172554",
      bgEnd: "#083344",
      blob1: "rgba(59, 130, 246, 0.42)",
      blob2: "rgba(20, 184, 166, 0.30)",
      blob3: "rgba(234, 179, 8, 0.24)",
      accentFrom: "#3b82f6",
      accentVia: "#14b8a6",
      accentTo: "#eab308",
      accentSolid: "#3b82f6",
      accentSoft: "rgba(59, 130, 246, 0.22)",
      accentBorder: "rgba(96, 165, 250, 0.45)",
      accentText: "#bfdbfe",
      spotPrism: "rgba(234, 179, 8, 0.20)",
      cardBase: "rgba(255, 255, 255, 0.06)",
      chartStroke: "#60A5FA",
      chartDot: "#FACC15",
    },
    light: {
      bgPrimary: "#EFF6FF",
      bgStart: "#dbeafe",
      bgMid: "#ccfbf1",
      bgEnd: "#fef9c3",
      blob1: "rgba(59, 130, 246, 0.30)",
      blob2: "rgba(20, 184, 166, 0.28)",
      blob3: "rgba(234, 179, 8, 0.24)",
      accentFrom: "#1d4ed8",
      accentVia: "#0d9488",
      accentTo: "#ca8a04",
      accentSolid: "#1d4ed8",
      accentSoft: "rgba(29, 78, 216, 0.12)",
      accentBorder: "rgba(29, 78, 216, 0.3)",
      accentText: "#1e3a8a",
      spotPrism: "rgba(59, 130, 246, 0.18)",
      cardBase: "rgba(255, 255, 255, 0.66)",
      lightShadow: "rgba(29, 78, 216, 0.12)",
      chartStroke: "#2563EB",
      chartDot: "#CA8A04",
    },
  },
  {
    id: 5,
    nameEn: "5. Cyber Prism: Cyan × Magenta",
    nameAr: "٥. سايبر أزرق × نيلي × أرجواني",
    swatch: "linear-gradient(135deg, #06b6d4, #6366f1, #e879f9)",
    dark: {
      bgPrimary: "#070914",
      bgStart: "#082f49",
      bgMid: "#1e1b4b",
      bgEnd: "#4a044e",
      blob1: "rgba(34, 211, 238, 0.38)",
      blob2: "rgba(99, 102, 241, 0.35)",
      blob3: "rgba(232, 121, 249, 0.28)",
      accentFrom: "#06b6d4",
      accentVia: "#6366f1",
      accentTo: "#d946ef",
      accentSolid: "#0ea5e9",
      accentSoft: "rgba(6, 182, 212, 0.22)",
      accentBorder: "rgba(56, 189, 248, 0.44)",
      accentText: "#bae6fd",
      spotPrism: "rgba(56, 189, 248, 0.24)",
      cardBase: "rgba(255, 255, 255, 0.065)",
      chartStroke: "#22D3EE",
      chartDot: "#E879F9",
    },
    light: {
      bgPrimary: "#ECFEFF",
      bgStart: "#cffafe",
      bgMid: "#e0e7ff",
      bgEnd: "#fae8ff",
      blob1: "rgba(6, 182, 212, 0.32)",
      blob2: "rgba(99, 102, 241, 0.26)",
      blob3: "rgba(217, 70, 239, 0.24)",
      accentFrom: "#0284c7",
      accentVia: "#4f46e5",
      accentTo: "#c026d3",
      accentSolid: "#0284c7",
      accentSoft: "rgba(2, 132, 199, 0.13)",
      accentBorder: "rgba(2, 132, 199, 0.32)",
      accentText: "#075985",
      spotPrism: "rgba(6, 182, 212, 0.2)",
      cardBase: "rgba(255, 255, 255, 0.66)",
      lightShadow: "rgba(2, 132, 199, 0.13)",
      chartStroke: "#0284C7",
      chartDot: "#C026D3",
    },
  },
  {
    id: 6,
    nameEn: "6. Oasis Sage × Sand",
    nameAr: "٦. واحة خضراء × فيروزي × رمل دافئ",
    swatch: "linear-gradient(135deg, #22c55e, #0d9488, #d97706)",
    dark: {
      bgPrimary: "#06120D",
      bgStart: "#052e16",
      bgMid: "#112a2e",
      bgEnd: "#292018",
      blob1: "rgba(34, 197, 94, 0.38)",
      blob2: "rgba(20, 184, 166, 0.30)",
      blob3: "rgba(245, 158, 11, 0.22)",
      accentFrom: "#22c55e",
      accentVia: "#14b8a6",
      accentTo: "#f59e0b",
      accentSolid: "#22c55e",
      accentSoft: "rgba(34, 197, 94, 0.20)",
      accentBorder: "rgba(74, 222, 128, 0.42)",
      accentText: "#bbf7d0",
      spotPrism: "rgba(74, 222, 128, 0.22)",
      cardBase: "rgba(255, 255, 255, 0.06)",
      chartStroke: "#4ADE80",
      chartDot: "#FBBF24",
    },
    light: {
      bgPrimary: "#F0FDF4",
      bgStart: "#dcfce7",
      bgMid: "#ccfbf1",
      bgEnd: "#fef3c7",
      blob1: "rgba(34, 197, 94, 0.30)",
      blob2: "rgba(20, 184, 166, 0.26)",
      blob3: "rgba(245, 158, 11, 0.24)",
      accentFrom: "#16a34a",
      accentVia: "#0d9488",
      accentTo: "#d97706",
      accentSolid: "#16a34a",
      accentSoft: "rgba(22, 163, 74, 0.13)",
      accentBorder: "rgba(22, 163, 74, 0.32)",
      accentText: "#166534",
      spotPrism: "rgba(34, 197, 94, 0.18)",
      cardBase: "rgba(255, 255, 255, 0.68)",
      lightShadow: "rgba(22, 163, 74, 0.12)",
      chartStroke: "#16A34A",
      chartDot: "#D97706",
    },
  },
  {
    id: 7,
    nameEn: "7. Celestial Plum × Peach",
    nameAr: "٧. خزامى × أزرق سماوي × خوخ دافئ",
    swatch: "linear-gradient(135deg, #8b5cf6, #3b82f6, #fb923c)",
    dark: {
      bgPrimary: "#0E0B1A",
      bgStart: "#2e1065",
      bgMid: "#1e1b4b",
      bgEnd: "#431407",
      blob1: "rgba(167, 139, 250, 0.40)",
      blob2: "rgba(96, 165, 250, 0.30)",
      blob3: "rgba(251, 146, 60, 0.26)",
      accentFrom: "#8b5cf6",
      accentVia: "#3b82f6",
      accentTo: "#fb923c",
      accentSolid: "#8b5cf6",
      accentSoft: "rgba(139, 92, 246, 0.22)",
      accentBorder: "rgba(167, 139, 250, 0.44)",
      accentText: "#ddd6fe",
      spotPrism: "rgba(251, 146, 60, 0.22)",
      cardBase: "rgba(255, 255, 255, 0.068)",
      chartStroke: "#A78BFA",
      chartDot: "#FB923C",
    },
    light: {
      bgPrimary: "#FAF5FF",
      bgStart: "#f3e8ff",
      bgMid: "#dbeafe",
      bgEnd: "#ffedd5",
      blob1: "rgba(168, 85, 247, 0.28)",
      blob2: "rgba(59, 130, 246, 0.26)",
      blob3: "rgba(251, 146, 60, 0.26)",
      accentFrom: "#7c3aed",
      accentVia: "#2563eb",
      accentTo: "#ea580c",
      accentSolid: "#7c3aed",
      accentSoft: "rgba(124, 58, 237, 0.12)",
      accentBorder: "rgba(124, 58, 237, 0.3)",
      accentText: "#5b21b6",
      spotPrism: "rgba(168, 85, 247, 0.16)",
      cardBase: "rgba(255, 255, 255, 0.68)",
      lightShadow: "rgba(124, 58, 237, 0.12)",
      chartStroke: "#7C3AED",
      chartDot: "#EA580C",
    },
  },
  {
    id: 8,
    nameEn: "8. Obsidian × Iridescent Pearl",
    nameAr: "٨. أوبسيديان × لؤلؤي قزحي",
    swatch: "linear-gradient(135deg, #334155, #818cf8, #f472b6)",
    dark: {
      bgPrimary: "#09090D",
      bgStart: "#09090b",
      bgMid: "#18181b",
      bgEnd: "#1e1b4b",
      blob1: "rgba(148, 163, 184, 0.26)",
      blob2: "rgba(129, 140, 248, 0.26)",
      blob3: "rgba(244, 114, 182, 0.20)",
      accentFrom: "#6366f1",
      accentVia: "#a855f7",
      accentTo: "#ec4899",
      accentSolid: "#6366f1",
      accentSoft: "rgba(129, 140, 248, 0.22)",
      accentBorder: "rgba(165, 180, 252, 0.4)",
      accentText: "#e0e7ff",
      spotPrism: "rgba(255, 255, 255, 0.22)",
      cardBase: "rgba(255, 255, 255, 0.055)",
      chartStroke: "#94A3B8",
      chartDot: "#818CF8",
    },
    light: {
      bgPrimary: "#F1F5F9",
      bgStart: "#e2e8f0",
      bgMid: "#ede9fe",
      bgEnd: "#fce7f3",
      blob1: "rgba(100, 116, 139, 0.24)",
      blob2: "rgba(99, 102, 241, 0.24)",
      blob3: "rgba(236, 72, 153, 0.2)",
      accentFrom: "#334155",
      accentVia: "#4f46e5",
      accentTo: "#db2777",
      accentSolid: "#334155",
      accentSoft: "rgba(51, 65, 85, 0.12)",
      accentBorder: "rgba(51, 65, 85, 0.28)",
      accentText: "#1e293b",
      spotPrism: "rgba(99, 102, 241, 0.16)",
      cardBase: "rgba(255, 255, 255, 0.72)",
      lightShadow: "rgba(51, 65, 85, 0.12)",
      chartStroke: "#475569",
      chartDot: "#4F46E5",
    },
  },
];

export const MOOD_AURA_BLOBS: Record<MoodType, { color: string; blob: string }> = {
  Happy: { color: "#4ADE80", blob: "rgba(74, 222, 128, 0.44)" },
  Calm: { color: "#60A5FA", blob: "rgba(96, 165, 250, 0.44)" },
  Tired: { color: "#A78BFA", blob: "rgba(167, 139, 250, 0.44)" },
  Sad: { color: "#818CF8", blob: "rgba(129, 140, 248, 0.44)" },
  Frustrated: { color: "#F87171", blob: "rgba(248, 113, 113, 0.44)" },
};

export interface AppearanceState {
  theme: "dark" | "light";
  paletteId: number;
  moodStyle: MoodButtonStyle;
  spotlightStyle: SpotlightStyle;
  moodReactive: boolean;
}

export function getPaletteById(id: number): ThemePalette {
  return PALETTES.find((p) => p.id === id) || PALETTES[3];
}

export function getStoredAppearance(): AppearanceState {
  if (typeof window === "undefined") {
    return {
      theme: "dark",
      paletteId: DEFAULT_PALETTE_ID,
      moodStyle: DEFAULT_MOOD_STYLE,
      spotlightStyle: DEFAULT_SPOTLIGHT_STYLE,
      moodReactive: false,
    };
  }

  const storedTheme = localStorage.getItem("moodflow-theme") === "light" ? "light" : "dark";
  const rawPal = Number(localStorage.getItem(PALETTE_STORAGE_KEY) || DEFAULT_PALETTE_ID);
  const paletteId = PALETTES.some((p) => p.id === rawPal) ? rawPal : DEFAULT_PALETTE_ID;

  const rawMoodStyle = localStorage.getItem(MOOD_STYLE_STORAGE_KEY);
  const moodStyle: MoodButtonStyle =
    rawMoodStyle === "keycaps" || rawMoodStyle === "orbs" ? rawMoodStyle : "hybrid";

  const rawSpot = localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
  const spotlightStyle: SpotlightStyle = rawSpot === "accent" ? "accent" : "classic";

  const rawReactive = localStorage.getItem(MOOD_REACTIVE_STORAGE_KEY);
  // Automatic Mode-Aware Aura Rule: OFF in Dark Mode, ON in Light Mode by default
  const moodReactive =
    rawReactive === "true"
      ? true
      : rawReactive === "false"
      ? false
      : storedTheme === "light";

  return {
    theme: storedTheme,
    paletteId,
    moodStyle,
    spotlightStyle,
    moodReactive,
  };
}

export function dispatchAppearanceChange(activeMood?: MoodType | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("moodflow-appearance-change", {
      detail: { activeMood: activeMood ?? null },
    })
  );
}

export function setStoredPaletteId(paletteId: number): void {
  if (typeof window === "undefined") return;
  const valid = PALETTES.some((p) => p.id === paletteId) ? paletteId : DEFAULT_PALETTE_ID;
  localStorage.setItem(PALETTE_STORAGE_KEY, String(valid));
  applyAppearanceTokens({ ...getStoredAppearance(), paletteId: valid });
  dispatchAppearanceChange();
}

export function setStoredMoodStyle(style: MoodButtonStyle): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOOD_STYLE_STORAGE_KEY, style);
  dispatchAppearanceChange();
}

export function setStoredSpotlightStyle(style: SpotlightStyle): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SPOTLIGHT_STORAGE_KEY, style);
  applyAppearanceTokens({ ...getStoredAppearance(), spotlightStyle: style });
  dispatchAppearanceChange();
}

export function setStoredMoodReactive(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOOD_REACTIVE_STORAGE_KEY, enabled ? "true" : "false");
  applyAppearanceTokens({ ...getStoredAppearance(), moodReactive: enabled });
  dispatchAppearanceChange();
}

export function applyAppearanceTokens(
  appearance: AppearanceState,
  activeMood?: MoodType | null
): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isLight = appearance.theme === "light";
  const pal = getPaletteById(appearance.paletteId);
  const cfg = isLight ? pal.light : pal.dark;
  const moodAura = activeMood ? MOOD_AURA_BLOBS[activeMood] : null;

  root.classList.toggle("light", isLight);
  root.classList.toggle("dark", !isLight);

  root.style.setProperty("--bg-primary", cfg.bgPrimary);
  root.style.setProperty("--bg-card-base", cfg.cardBase);
  root.style.setProperty("--text-primary", isLight ? "#0F172A" : "#FFFFFF");
  root.style.setProperty("--text-secondary", isLight ? "#334155" : "rgba(255, 255, 255, 0.72)");
  root.style.setProperty("--text-tertiary", isLight ? "#64748B" : "rgba(255, 255, 255, 0.50)");
  root.style.setProperty("--border-color", isLight ? "rgba(255, 255, 255, 0.90)" : "rgba(255, 255, 255, 0.22)");

  root.style.setProperty("--bg-gradient-start", cfg.bgStart);
  root.style.setProperty("--bg-gradient-mid", cfg.bgMid);
  root.style.setProperty("--bg-gradient-end", cfg.bgEnd);

  root.style.setProperty(
    "--blob-1",
    appearance.moodReactive && moodAura ? moodAura.blob : cfg.blob1
  );
  root.style.setProperty("--blob-2", cfg.blob2);
  root.style.setProperty("--blob-3", cfg.blob3);

  root.style.setProperty("--accent-from", cfg.accentFrom);
  root.style.setProperty("--accent-via", cfg.accentVia);
  root.style.setProperty("--accent-to", cfg.accentTo);
  root.style.setProperty("--accent-solid", cfg.accentSolid);
  root.style.setProperty("--accent-soft", cfg.accentSoft);
  root.style.setProperty("--accent-border", cfg.accentBorder);
  root.style.setProperty("--accent-text", cfg.accentText);
  root.style.setProperty("--chart-stroke", cfg.chartStroke);
  root.style.setProperty("--chart-dot", cfg.chartDot);

  const spotVal =
    appearance.spotlightStyle === "classic"
      ? isLight
        ? "rgba(255, 255, 255, 0.96)"
        : "rgba(255, 255, 255, 0.18)"
      : cfg.spotPrism;
  root.style.setProperty("--spotlight-color", spotVal);

  root.style.setProperty(
    "--card-shadow",
    isLight
      ? `0 18px 40px -10px ${cfg.lightShadow || "rgba(29, 78, 216, 0.12)"}`
      : "0 24px 48px -12px rgba(0, 0, 0, 0.50)"
  );
  root.style.setProperty(
    "--well-bg",
    isLight ? "rgba(15, 23, 42, 0.055)" : "rgba(8, 10, 20, 0.42)"
  );
  root.style.setProperty(
    "--well-border",
    isLight ? "rgba(15, 23, 42, 0.10)" : "rgba(255, 255, 255, 0.14)"
  );
  root.style.setProperty("--mood-glow", moodAura ? moodAura.blob : cfg.accentSoft);
}
