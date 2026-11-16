import type { TagCorrelation } from "./sentiment";

export const FACTOR_PREFS_STORAGE_KEY = "moodflow-factor-prefs";

export interface CustomFactor {
  id: string;
  label: string;
  direction: "lift" | "drain";
  manualDelta?: number;
}

export interface FactorPreferences {
  renamed: Record<string, string>;
  pinned: string[];
  hidden: string[];
  customFactors: CustomFactor[];
}

export interface DisplayFactor {
  key: string;
  rawTag: string;
  label: string;
  delta: number;
  count: number;
  direction: "lift" | "drain";
  isPinned: boolean;
  isHidden: boolean;
  isCustom: boolean;
  customId?: string;
}

const DEFAULT_PREFS: FactorPreferences = {
  renamed: {},
  pinned: [],
  hidden: [],
  customFactors: [],
};

export function normalizeFactorKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getFactorPreferences(): FactorPreferences {
  if (typeof globalThis.localStorage === "undefined") {
    return { ...DEFAULT_PREFS, renamed: {}, pinned: [], hidden: [], customFactors: [] };
  }
  try {
    const raw = globalThis.localStorage.getItem(FACTOR_PREFS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFS, renamed: {}, pinned: [], hidden: [], customFactors: [] };
    }
    const parsed = JSON.parse(raw) as Partial<FactorPreferences>;
    return {
      renamed: parsed.renamed && typeof parsed.renamed === "object" ? parsed.renamed : {},
      pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      customFactors: Array.isArray(parsed.customFactors) ? parsed.customFactors : [],
    };
  } catch {
    return { ...DEFAULT_PREFS, renamed: {}, pinned: [], hidden: [], customFactors: [] };
  }
}

export function saveFactorPreferences(prefs: FactorPreferences): FactorPreferences {
  if (typeof globalThis.localStorage !== "undefined") {
    try {
      globalThis.localStorage.setItem(FACTOR_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors
    }
  }
  return prefs;
}

export function renameFactor(key: string, newLabel: string): FactorPreferences {
  const prefs = getFactorPreferences();
  const normKey = normalizeFactorKey(key);
  const trimmed = newLabel.trim();
  if (!trimmed) {
    delete prefs.renamed[normKey];
  } else {
    prefs.renamed[normKey] = trimmed;
  }
  return saveFactorPreferences(prefs);
}

export function togglePinFactor(key: string): FactorPreferences {
  const prefs = getFactorPreferences();
  const normKey = normalizeFactorKey(key);
  if (prefs.pinned.includes(normKey)) {
    prefs.pinned = prefs.pinned.filter((k) => k !== normKey);
  } else {
    prefs.pinned = [...prefs.pinned, normKey];
  }
  return saveFactorPreferences(prefs);
}

export function toggleHideFactor(key: string): FactorPreferences {
  const prefs = getFactorPreferences();
  const normKey = normalizeFactorKey(key);
  if (prefs.hidden.includes(normKey)) {
    prefs.hidden = prefs.hidden.filter((k) => k !== normKey);
  } else {
    prefs.hidden = [...prefs.hidden, normKey];
  }
  return saveFactorPreferences(prefs);
}

export function addCustomFactor(
  label: string,
  direction: "lift" | "drain",
  manualDelta?: number
): FactorPreferences {
  const trimmed = label.trim();
  const prefs = getFactorPreferences();
  if (!trimmed) return prefs;

  const norm = normalizeFactorKey(trimmed);
  const exists = prefs.customFactors.some((f) => normalizeFactorKey(f.label) === norm);
  if (!exists) {
    prefs.customFactors = [
      ...prefs.customFactors,
      {
        id: `custom:${norm}`,
        label: trimmed,
        direction,
        manualDelta:
          typeof manualDelta === "number"
            ? manualDelta
            : direction === "lift"
            ? 12
            : -12,
      },
    ];
  }
  return saveFactorPreferences(prefs);
}

export function removeCustomFactor(keyOrId: string): FactorPreferences {
  const prefs = getFactorPreferences();
  const norm = normalizeFactorKey(keyOrId);
  prefs.customFactors = prefs.customFactors.filter(
    (f) => normalizeFactorKey(f.id) !== norm && normalizeFactorKey(f.label) !== norm
  );
  prefs.pinned = prefs.pinned.filter((k) => k !== norm);
  prefs.hidden = prefs.hidden.filter((k) => k !== norm);
  delete prefs.renamed[norm];
  return saveFactorPreferences(prefs);
}

export function resetFactorPreferences(): FactorPreferences {
  return saveFactorPreferences({
    renamed: {},
    pinned: [],
    hidden: [],
    customFactors: [],
  });
}

export function buildEditableFactors(
  correlations: TagCorrelation[],
  prefs: FactorPreferences,
  translateTagFn?: (tag: string) => string
): {
  lifters: DisplayFactor[];
  drainers: DisplayFactor[];
  hiddenItems: DisplayFactor[];
} {
  const items: DisplayFactor[] = [];
  const seenKeys = new Set<string>();

  for (const corr of correlations) {
    if (corr.direction === "neutral") continue;
    const key = normalizeFactorKey(corr.tag);
    seenKeys.add(key);

    const customMatch = prefs.customFactors.find(
      (c) => normalizeFactorKey(c.label) === key
    );
    const defaultLabel = translateTagFn ? translateTagFn(corr.tag) : corr.tag;
    const label = prefs.renamed[key] || defaultLabel;

    items.push({
      key,
      rawTag: corr.tag,
      label,
      delta: corr.delta,
      count: corr.count,
      direction: corr.direction,
      isPinned: prefs.pinned.includes(key),
      isHidden: prefs.hidden.includes(key),
      isCustom: Boolean(customMatch),
      customId: customMatch?.id,
    });
  }

  for (const custom of prefs.customFactors) {
    const labelKey = normalizeFactorKey(custom.label);
    const idKey = normalizeFactorKey(custom.id);
    if (seenKeys.has(labelKey) || seenKeys.has(idKey)) continue;

    const prefKey = labelKey;
    const label = prefs.renamed[prefKey] || prefs.renamed[idKey] || custom.label;
    const delta =
      typeof custom.manualDelta === "number"
        ? custom.manualDelta
        : custom.direction === "lift"
        ? 12
        : -12;

    items.push({
      key: prefKey,
      rawTag: custom.label,
      label,
      delta,
      count: 0,
      direction: custom.direction,
      isPinned: prefs.pinned.includes(prefKey) || prefs.pinned.includes(idKey),
      isHidden: prefs.hidden.includes(prefKey) || prefs.hidden.includes(idKey),
      isCustom: true,
      customId: custom.id,
    });
  }

  const sortFn = (a: DisplayFactor, b: DisplayFactor) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return Math.abs(b.delta) - Math.abs(a.delta);
  };

  const hiddenItems = items.filter((i) => i.isHidden).sort(sortFn);
  const visible = items.filter((i) => !i.isHidden);

  return {
    lifters: visible.filter((i) => i.direction === "lift").sort(sortFn),
    drainers: visible.filter((i) => i.direction === "drain").sort(sortFn),
    hiddenItems,
  };
}
