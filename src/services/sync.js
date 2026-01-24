import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { storage } from './storage';

const ENTRIES_COLLECTION = 'entries';

export const syncService = {
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
   * Merge local and cloud data, preferring newest version
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
        merged[dateStr] = cloudEntry;
      } else {
        // Both have the entry - use the newer one
        const localTime = localEntry.lastUpdated || 0;
        const cloudTime = cloudEntry.lastUpdated || 0;

        if (cloudTime > localTime) {
          merged[dateStr] = cloudEntry;
        }
        // Otherwise keep local version (already in merged)
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

    // Get local data
    const localData = await storage.exportAllData();

    // Get cloud data
    const cloudEntries = await this.syncFromCloud(userId);

    // Merge
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

    return {
      localCount: Object.keys(localData.entries).length,
      cloudCount: Object.keys(cloudEntries).length,
      mergedCount: Object.keys(merged).length
    };
  },

  /**
   * Sync a single entry to cloud
   * @param {string} userId - The authenticated user's ID
   * @param {string} dateStr - The date string (YYYY-MM-DD)
   * @param {Object} entry - The entry data
   */
  async syncEntry(userId, dateStr, entry) {
    if (!isFirebaseConfigured() || !db) {
      return; // Silently fail if not configured
    }

    const entryRef = doc(db, 'users', userId, ENTRIES_COLLECTION, dateStr);
    await setDoc(entryRef, {
      ...entry,
      syncedAt: Date.now()
    });
  }
};

export default syncService;
