import type { MoodEntry, MoodType } from "@/types/mood";

export interface QueuedCreatePayload {
  mood: MoodType;
  intensity: number;
  text: string;
  tags: string[];
  date: string;
  time: string;
  sentiment_score: number;
  sentiment_keywords: string[];
}

export interface QueuedUpdatePayload {
  mood?: MoodType;
  intensity?: number;
  text?: string;
  tags?: string[];
  sentiment_score?: number;
  sentiment_keywords?: string[];
}

export type OfflineMutationItem =
  | {
      id: string;
      type: "CREATE";
      tempId: string;
      payload: QueuedCreatePayload;
      createdAt: string;
    }
  | {
      id: string;
      type: "UPDATE";
      targetId: string;
      payload: QueuedUpdatePayload;
      createdAt: string;
    }
  | {
      id: string;
      type: "DELETE";
      targetId: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "CLEAR_ALL";
      createdAt: string;
    };

const QUEUE_KEY_PREFIX = "moodflow-sync-queue:";
const ENTRIES_CACHE_PREFIX = "moodflow-entries-cache:";

function getQueueStorageKey(userId: string): string {
  return `${QUEUE_KEY_PREFIX}${userId.trim().toLowerCase()}`;
}

function getEntriesCacheKey(userId: string): string {
  return `${ENTRIES_CACHE_PREFIX}${userId.trim().toLowerCase()}`;
}

export function getOfflineQueue(userId: string): OfflineMutationItem[] {
  if (!userId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(getQueueStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineMutationItem[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(
  userId: string,
  queue: OfflineMutationItem[]
): void {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(getQueueStorageKey(userId));
    } else {
      localStorage.setItem(getQueueStorageKey(userId), JSON.stringify(queue));
    }
  } catch {
    // Ignore quota errors
  }
}

export function clearOfflineQueue(userId: string): void {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(getQueueStorageKey(userId));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Coalesces a new offline mutation into an existing queue (pure function for testability).
 *
 * Conflict-resolution invariants:
 * 1. `CLEAR_ALL` wipes all prior pending mutations and leaves a single `CLEAR_ALL`.
 * 2. `UPDATE` targeting an offline-created `tempId` merges directly into the pending `CREATE` payload.
 * 3. `UPDATE` targeting an already-queued `UPDATE` (`targetId`) merges fields into the existing `UPDATE`.
 * 4. `DELETE` targeting an offline-created `tempId` cancels the pending `CREATE` completely (zero network op).
 * 5. `DELETE` targeting a server UUID removes any prior `UPDATE` for that UUID and appends `DELETE`.
 */
export function coalesceMutation(
  existingQueue: OfflineMutationItem[],
  item: OfflineMutationItem
): OfflineMutationItem[] {
  const queue = [...existingQueue];

  if (item.type === "CLEAR_ALL") {
    return [item];
  }

  if (item.type === "UPDATE") {
    const createIdx = queue.findIndex(
      (q) => q.type === "CREATE" && q.tempId === item.targetId
    );
    if (createIdx !== -1) {
      const existingCreate = queue[createIdx] as Extract<
        OfflineMutationItem,
        { type: "CREATE" }
      >;
      queue[createIdx] = {
        ...existingCreate,
        payload: {
          ...existingCreate.payload,
          ...(item.payload.mood !== undefined && { mood: item.payload.mood }),
          ...(item.payload.intensity !== undefined && {
            intensity: item.payload.intensity,
          }),
          ...(item.payload.text !== undefined && { text: item.payload.text }),
          ...(item.payload.tags !== undefined && { tags: item.payload.tags }),
          ...(item.payload.sentiment_score !== undefined && {
            sentiment_score: item.payload.sentiment_score,
          }),
          ...(item.payload.sentiment_keywords !== undefined && {
            sentiment_keywords: item.payload.sentiment_keywords,
          }),
        },
      };
      return queue;
    }

    const updateIdx = queue.findIndex(
      (q) => q.type === "UPDATE" && q.targetId === item.targetId
    );
    if (updateIdx !== -1) {
      const existingUpdate = queue[updateIdx] as Extract<
        OfflineMutationItem,
        { type: "UPDATE" }
      >;
      queue[updateIdx] = {
        ...existingUpdate,
        payload: {
          ...existingUpdate.payload,
          ...item.payload,
        },
      };
      return queue;
    }

    queue.push(item);
    return queue;
  }

  if (item.type === "DELETE") {
    const createIdx = queue.findIndex(
      (q) => q.type === "CREATE" && q.tempId === item.targetId
    );
    if (createIdx !== -1) {
      queue.splice(createIdx, 1);
      return queue;
    }

    const filtered = queue.filter(
      (q) => !(q.type === "UPDATE" && q.targetId === item.targetId) &&
             !(q.type === "DELETE" && q.targetId === item.targetId)
    );
    filtered.push(item);
    return filtered;
  }

  queue.push(item);
  return queue;
}

export function enqueueOfflineMutation(
  userId: string,
  item: OfflineMutationItem
): OfflineMutationItem[] {
  const current = getOfflineQueue(userId);
  const next = coalesceMutation(current, item);
  saveOfflineQueue(userId, next);
  return next;
}

export function getCachedEntries(userId: string): MoodEntry[] {
  if (!userId || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(getEntriesCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MoodEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCachedEntries(userId: string, entries: MoodEntry[]): void {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(getEntriesCacheKey(userId), JSON.stringify(entries));
  } catch {
    // Ignore quota errors
  }
}

export function clearCachedEntries(userId: string): void {
  if (!userId || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(getEntriesCacheKey(userId));
  } catch {
    // Ignore storage errors
  }
}
