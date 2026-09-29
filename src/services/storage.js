import { get, set, keys } from 'idb-keyval';

const STORE_KEY_PREFIX = 'morning_page_';
const RECOVERY_KEY_PREFIX = 'morning_page_recovery_';
const listeners = new Set();
const pendingWrites = new Map();
const lastIssuedTimestamps = new Map();

const getDateKey = (dateStr) => `${STORE_KEY_PREFIX}${dateStr}`;
const getRecoveryKey = (dateStr) => `${RECOVERY_KEY_PREFIX}${dateStr}`;

const emitChange = (dateStr) => {
    listeners.forEach((listener) => listener(dateStr));
};

const getRecoveryEntry = (dateStr) => {
    if (typeof window === 'undefined') return null;

    try {
        const value = window.localStorage.getItem(getRecoveryKey(dateStr));
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
};

const stripHtml = (value = '') =>
    value
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeEntry = (rawEntry) => {
    if (!rawEntry) {
        return {
            content: '',
            contentHtml: '',
            lastUpdated: 0
        };
    }

    if (typeof rawEntry === 'string') {
        return {
            content: rawEntry,
            contentHtml: rawEntry,
            lastUpdated: 0
        };
    }

    const contentHtml = typeof rawEntry.contentHtml === 'string' ? rawEntry.contentHtml : '';
    const contentFromField = typeof rawEntry.content === 'string' ? rawEntry.content : '';
    const content = contentFromField || stripHtml(contentHtml);

    return {
        ...rawEntry,
        content,
        contentHtml: contentHtml || content,
        lastUpdated: rawEntry.lastUpdated || 0
    };
};

export const storage = {
    async saveEntry(dateStr, content, contentHtml = content, lastUpdated = null) {
        const issuedTimestamp = lastUpdated || Math.max(
            Date.now(),
            (lastIssuedTimestamps.get(dateStr) || 0) + 1
        );
        lastIssuedTimestamps.set(dateStr, issuedTimestamp);

        const entry = {
            content,
            contentHtml,
            lastUpdated: issuedTimestamp
        };

        // Keep a synchronous crash-recovery copy before the async IndexedDB write.
        // This prevents a quick refresh, tab close, or date switch from losing the
        // last few keystrokes.
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(getRecoveryKey(dateStr), JSON.stringify(entry));
            } catch {
                // IndexedDB remains the primary store if localStorage is unavailable/full.
            }
        }

        const previousWrite = pendingWrites.get(dateStr) || Promise.resolve();
        const write = previousWrite
            .catch(() => {})
            .then(async () => {
                await set(getDateKey(dateStr), entry);

                if (typeof window !== 'undefined') {
                    const recovery = getRecoveryEntry(dateStr);
                    if (recovery?.lastUpdated === entry.lastUpdated) {
                        window.localStorage.removeItem(getRecoveryKey(dateStr));
                    }
                }

                emitChange(dateStr);
            });

        pendingWrites.set(dateStr, write);

        try {
            await write;
        } finally {
            if (pendingWrites.get(dateStr) === write) {
                pendingWrites.delete(dateStr);
            }
        }

        return entry;
    },

    async saveEntryData(dateStr, rawEntry) {
        const entry = normalizeEntry(rawEntry);
        return this.saveEntry(
            dateStr,
            entry.content,
            entry.contentHtml,
            entry.lastUpdated || Date.now()
        );
    },

    async getEntry(dateStr) {
        const data = normalizeEntry(await get(getDateKey(dateStr)));
        return data.content;
    },

    async getEntryData(dateStr) {
        const storedEntry = normalizeEntry(await get(getDateKey(dateStr)));
        const recoveryEntry = normalizeEntry(getRecoveryEntry(dateStr));

        return recoveryEntry.lastUpdated > storedEntry.lastUpdated
            ? recoveryEntry
            : storedEntry;
    },

    async getAllKeys() {
        return await keys();
    },

    async getStreak() {
        // Calculate streak dynamically by checking past days
        // This fixes issues where the metadata gets out of sync
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');
        
        let streak = 0;
        let checkDate = new Date(today);
        let foundGap = false;
        
        // Helper to check if a date has a completed entry
        const isDateCompleted = async (dateStr) => {
            const content = await this.getEntry(dateStr);
            if (!content) return false;
            // Simple word count approximation (matches App.jsx logic approximately)
            const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
            return wordCount >= 750;
        };

        // Check today first
        if (await isDateCompleted(todayStr)) {
            streak++;
        }

        // Check backwards regardless of today's status
        // If today is NOT done, we still want to see the streak ending yesterday.
        // If today IS done, we continue checking backwards from yesterday.
        
        checkDate.setDate(checkDate.getDate() - 1); // Start checking yesterday
        
        while (!foundGap) {
            const dateStr = checkDate.toLocaleDateString('en-CA');
            const completed = await isDateCompleted(dateStr);
            
            if (completed) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                foundGap = true;
            }
        }
        
        return { current: streak, max: streak, lastDate: todayStr }; // minimal compat object
    },

    async updateStreak() {
        // Just force a recalculation/get since we moved to dynamic
        return await this.getStreak();
    },

    async exportAllData() {
        await Promise.all([...pendingWrites.values()].map((write) => write.catch(() => {})));

        const allKeys = await keys();
        const dateKeys = allKeys.filter(k => k.startsWith(STORE_KEY_PREFIX));

        const entries = {};
        for (const key of dateKeys) {
            const data = normalizeEntry(await get(key));
            const dateStr = key.replace(STORE_KEY_PREFIX, '');
            entries[dateStr] = data;
        }

        return {
            version: 1,
            exportedAt: new Date().toISOString(),
            entries
        };
    },

    async importData(jsonData) {
        if (!jsonData || !jsonData.entries) {
            throw new Error('Invalid backup format');
        }

        const { entries } = jsonData;
        let imported = 0;

        for (const [dateStr, data] of Object.entries(entries)) {
            const key = getDateKey(dateStr);
            await set(key, normalizeEntry(data));
            emitChange(dateStr);
            imported++;
        }

        return imported;
    },

    downloadBackup(data, filename = 'morning-pages-backup.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    async requestPersistentStorage() {
        if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
            return false;
        }

        try {
            return await navigator.storage.persist();
        } catch {
            return false;
        }
    }
};
