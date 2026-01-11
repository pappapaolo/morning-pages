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

    async updateStreak(todayDateStr) {
        // Just force a recalculation/get since we moved to dynamic
        return await this.getStreak();
    }
};
