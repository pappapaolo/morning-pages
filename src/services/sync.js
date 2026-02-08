import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { storage } from './storage';

const ENTRIES_COLLECTION = 'entries';

// Retry queue for failed syncs
const retryQueue = new Map(); // dateStr -> { entry, retries, nextRetry }
let retryIntervalId = null;
let currentUserId = null;

// Online/offline tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let onlineCallbacks = [];

const stripHtml = (value = '') =>
  value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getPlainContent = (entry) => {
  if (!entry) return '';
  if (typeof entry.content === 'string' && entry.content.length > 0) return entry.content;
  if (typeof entry.contentHtml === 'string' && entry.contentHtml.length > 0) {
    return stripHtml(entry.contentHtml);
  }
  return '';
};

const normalizeEntryShape = (entry) => {
  const content = getPlainContent(entry);
  const contentHtml =
    typeof entry?.contentHtml === 'string' && entry.contentHtml.length > 0
      ? entry.contentHtml
      : content;

  return {
    ...entry,
    content,
    contentHtml,
    lastUpdated: entry?.lastUpdated || 0
  };
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    onlineCallbacks.forEach(cb => cb(true));
    processRetryQueue();
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    onlineCallbacks.forEach(cb => cb(false));
  });
}

/**
 * Smart conflict resolution - never lose substantial content
 */
function resolveConflict(local, cloud) {
  const normalizedLocal = normalizeEntryShape(local);
  const normalizedCloud = normalizeEntryShape(cloud);
  const localContent = normalizedLocal.content;
  const cloudContent = normalizedCloud.content;
  const localTime = local?.lastUpdated || 0;
  const cloudTime = cloud?.lastUpdated || 0;

  // Rule 1: Never let empty/tiny version overwrite substantial content
  if (cloudContent.length < 50 && localContent.length > 200) {
    return normalizedLocal; // Keep local, cloud looks like accidental clear
  }
  if (localContent.length < 50 && cloudContent.length > 200) {
    return normalizedCloud; // Keep cloud, local looks like accidental clear
  }

  // Rule 2: If content is identical or nearly identical, use newer timestamp
  if (localContent === cloudContent) {
    return cloudTime > localTime ? normalizedCloud : normalizedLocal;
  }

  // Rule 3: If one contains the other (normal edit flow), use the longer/newer
  if (cloudContent.includes(localContent.slice(0, 100)) && cloudContent.length >= localContent.length) {
    return normalizedCloud;
  }
  if (localContent.includes(cloudContent.slice(0, 100)) && localContent.length >= cloudContent.length) {
    return normalizedLocal;
  }

  // Rule 4: Both have unique substantial content - merge them
  const base = localTime < cloudTime ? normalizedLocal : normalizedCloud;
  const newer = localTime < cloudTime ? normalizedCloud : normalizedLocal;

  const baseContent = base?.content || '';
  const newerContent = newer?.content || '';

  // Find content in newer that's not in base (simple approach: if newer is significantly different)
  const overlap = findOverlap(baseContent, newerContent);
  if (overlap < 0.5 && newerContent.length > 50) {
    // Less than 50% overlap and newer has substantial content - merge
    return {
      content: baseContent + '\n\n---\n\n' + newerContent,
      contentHtml: baseContent + '\n\n---\n\n' + newerContent,
      lastUpdated: Date.now()
    };
  }

  // Default to newer version
  return cloudTime > localTime ? normalizedCloud : normalizedLocal;
}

/**
 * Simple overlap calculation (percentage of shorter string found in longer)
 */
function findOverlap(a, b) {
  if (!a || !b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;

  // Check chunks of shorter text exist in longer
  const chunkSize = 50;
  let foundChunks = 0;
  let totalChunks = 0;

  for (let i = 0; i < shorter.length; i += chunkSize) {
    const chunk = shorter.slice(i, i + chunkSize);
    if (chunk.length >= 20) {
      totalChunks++;
      if (longer.includes(chunk)) {
        foundChunks++;
      }
    }
  }

  return totalChunks > 0 ? foundChunks / totalChunks : 1;
}

/**
 * Process retry queue
 */
async function processRetryQueue() {
  if (!isOnline || !currentUserId || retryQueue.size === 0) return;

  const now = Date.now();
  const toRetry = [];

  for (const [dateStr, item] of retryQueue.entries()) {
    if (now >= item.nextRetry) {
      toRetry.push({ dateStr, ...item });
    }
  }

  for (const item of toRetry) {
    try {
      await syncService.syncEntry(currentUserId, item.dateStr, item.entry, true);
      retryQueue.delete(item.dateStr);
    } catch {
      const newRetries = item.retries + 1;
      if (newRetries >= 5) {
        console.error(`Giving up on syncing ${item.dateStr} after 5 retries`);
        retryQueue.delete(item.dateStr);
      } else {
        // Exponential backoff: 2s, 4s, 8s, 16s
        const delay = Math.pow(2, newRetries) * 1000;
        retryQueue.set(item.dateStr, {
          entry: item.entry,
          retries: newRetries,
          nextRetry: Date.now() + delay
        });
      }
    }
  }
}

export const syncService = {
  // Active subscription
  _unsubscribe: null,
  _onEntryUpdateCallback: null,

  /**
   * Check if online
   */
  isOnline() {
    return isOnline;
  },

  /**
   * Subscribe to online/offline changes
   */
  onOnlineChange(callback) {
    onlineCallbacks.push(callback);
    return () => {
      onlineCallbacks = onlineCallbacks.filter(cb => cb !== callback);
    };
  },

  /**
   * Push all local entries to Firestore
   * @param {string} userId - The authenticated user's ID
   */
  async syncToCloud(userId) {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }

    const localData = await storage.exportAllData();
    const { entries } = localData;

    const batch = writeBatch(db);
    const userEntriesRef = collection(db, 'users', userId, ENTRIES_COLLECTION);

    for (const [dateStr, entry] of Object.entries(entries)) {
      const entryRef = doc(userEntriesRef, dateStr);
      batch.set(entryRef, {
        ...entry,
        syncedAt: Date.now()
      });
    }

    await batch.commit();
    return Object.keys(entries).length;
  },

  /**
   * Pull all entries from Firestore
   * @param {string} userId - The authenticated user's ID
   */
  async syncFromCloud(userId) {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }

    const userEntriesRef = collection(db, 'users', userId, ENTRIES_COLLECTION);
    const snapshot = await getDocs(userEntriesRef);

    const cloudEntries = {};
    snapshot.forEach((doc) => {
      cloudEntries[doc.id] = doc.data();
    });

    return cloudEntries;
  },

  /**
   * Merge local and cloud data with smart conflict resolution
   * @param {Object} local - Local entries { dateStr: { content, lastUpdated } }
   * @param {Object} cloud - Cloud entries { dateStr: { content, lastUpdated, syncedAt } }
   * @returns {Object} Merged entries
   */
  mergeData(local, cloud) {
    const merged = { ...local };

    for (const [dateStr, cloudEntry] of Object.entries(cloud)) {
      const localEntry = local[dateStr];

      if (!localEntry) {
        // Cloud has an entry we don't have locally
        merged[dateStr] = normalizeEntryShape(cloudEntry);
      } else {
        // Both have the entry - use smart conflict resolution
        merged[dateStr] = resolveConflict(localEntry, cloudEntry);
      }
    }

    return merged;
  },

  /**
   * Full sync: merge local and cloud, update both
   * @param {string} userId - The authenticated user's ID
   */
  async fullSync(userId) {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }

    currentUserId = userId;

    // Get local data
    const localData = await storage.exportAllData();

    // Get cloud data
    const cloudEntries = await this.syncFromCloud(userId);

    // Merge with smart conflict resolution
    const merged = this.mergeData(localData.entries, cloudEntries);

    // Update local storage
    await storage.importData({ entries: merged });

    // Push merged data to cloud
    const batch = writeBatch(db);
    const userEntriesRef = collection(db, 'users', userId, ENTRIES_COLLECTION);

    for (const [dateStr, entry] of Object.entries(merged)) {
      const entryRef = doc(userEntriesRef, dateStr);
      batch.set(entryRef, {
        ...entry,
        syncedAt: Date.now()
      });
    }

    await batch.commit();

    // Start retry queue processing
    if (!retryIntervalId) {
      retryIntervalId = setInterval(processRetryQueue, 2000);
    }

    return {
      localCount: Object.keys(localData.entries).length,
      cloudCount: Object.keys(cloudEntries).length,
      mergedCount: Object.keys(merged).length
    };
  },

  /**
   * Sync a single entry to cloud with retry on failure
   * @param {string} userId - The authenticated user's ID
   * @param {string} dateStr - The date string (YYYY-MM-DD)
   * @param {Object} entry - The entry data
   * @param {boolean} isRetry - Whether this is a retry attempt
   */
  async syncEntry(userId, dateStr, entry, isRetry = false) {
    if (!isFirebaseConfigured() || !db) {
      throw new Error('Firebase is not configured');
    }

    currentUserId = userId;

    // If offline, queue for later
    if (!isOnline) {
      retryQueue.set(dateStr, {
        entry,
        retries: 0,
        nextRetry: Date.now()
      });
      throw new Error('Offline - queued for sync');
    }

    try {
      const entryRef = doc(db, 'users', userId, ENTRIES_COLLECTION, dateStr);
      await setDoc(entryRef, {
        ...entry,
        syncedAt: Date.now()
      });
      // Success - remove from retry queue if present
      retryQueue.delete(dateStr);
    } catch (err) {
      if (!isRetry) {
        // Add to retry queue
        retryQueue.set(dateStr, {
          entry,
          retries: 0,
          nextRetry: Date.now() + 2000
        });
      }
      throw err;
    }
  },

  /**
   * Subscribe to real-time updates from Firestore
   * @param {string} userId - The authenticated user's ID
   * @param {Function} onEntryUpdate - Callback when an entry is updated (dateStr, entry)
   * @returns {Function} Unsubscribe function
   */
  subscribeToUpdates(userId, onEntryUpdate) {
    if (!isFirebaseConfigured() || !db) {
      console.warn('Firebase not configured, skipping real-time subscription');
      return () => {};
    }

    // Unsubscribe from previous if exists
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    this._onEntryUpdateCallback = onEntryUpdate;
    currentUserId = userId;

    const userEntriesRef = collection(db, 'users', userId, ENTRIES_COLLECTION);

    this._unsubscribe = onSnapshot(
      userEntriesRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified' || change.type === 'added') {
            const dateStr = change.doc.id;
            const cloudEntry = change.doc.data();

            // Notify callback
            if (this._onEntryUpdateCallback) {
              this._onEntryUpdateCallback(dateStr, cloudEntry);
            }
          }
        });
      },
      (error) => {
        console.error('Real-time sync error:', error);
      }
    );

    // Start retry queue processing
    if (!retryIntervalId) {
      retryIntervalId = setInterval(processRetryQueue, 2000);
    }

    return () => {
      if (this._unsubscribe) {
        this._unsubscribe();
        this._unsubscribe = null;
      }
    };
  },

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._onEntryUpdateCallback = null;
    currentUserId = null;

    if (retryIntervalId) {
      clearInterval(retryIntervalId);
      retryIntervalId = null;
    }
  },

  /**
   * Get pending sync count (items in retry queue)
   */
  getPendingSyncCount() {
    return retryQueue.size;
  }
};

export default syncService;
