import { get, set, keys } from 'idb-keyval';

const STORE_KEY_PREFIX = 'morning_page_';

const getDateKey = (dateStr) => `${STORE_KEY_PREFIX}${dateStr}`;

export const storage = {
    async saveEntry(dateStr, content) {
        const entry = {
            content,
            lastUpdated: Date.now() // timestamp
        };
        await set(getDateKey(dateStr), entry);
    },

    async getEntry(dateStr) {
        const data = await get(getDateKey(dateStr));
        return data ? data.content : '';
    },

    async getAllKeys() {
        return await keys();
    },

    async getStreak() {
        const stored = await get('streak_info');
        // Default: current streak 0, max 0, last date null
        return stored || { current: 0, max: 0, lastDate: null };
    },

    async updateStreak(todayDateStr) {
        const streakInfo = await this.getStreak();

        // If already updated for today, return current
        if (streakInfo.lastDate === todayDateStr) {
            return streakInfo;
        }

        // Check if yesterday was the last date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        let newCurrent = 1;
        if (streakInfo.lastDate === yesterdayStr) {
            newCurrent = streakInfo.current + 1;
        }

        const newStreak = {
            current: newCurrent,
            max: Math.max(newCurrent, streakInfo.max),
            lastDate: todayDateStr
        };

        await set('streak_info', newStreak);
        return newStreak;
    }
};
