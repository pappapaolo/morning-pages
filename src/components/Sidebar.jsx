import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';

const Sidebar = ({ currentDate, onSelectDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadEntries();
        }
    }, [isOpen]);

    const loadEntries = async () => {
        // We need a way to get all keys or maintain a list.
        // Current storage implementation just has keys. 
        // We'll iterate all keys.
        const keys = await storage.getAllKeys();
        // Filter for keys that look like 'morning_page_YYYY-MM-DD'
        const dateKeys = keys.filter(k => k.startsWith('morning_page_')).sort();
        // Parse them to dates for display
        const processed = dateKeys.map(k => {
            const dateStr = k.replace('morning_page_', '');
            return {
                key: k,
                dateStr: dateStr,
                display: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
        });
        setEntries(processed);
    };

    return (
        <>
            <button
                className={`sidebar-toggle ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="History"
            >
                {isOpen ? '×' : '≡'}
            </button>

            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <h3>History</h3>
                <div className="entry-list">
                    {entries.length === 0 && <p className="empty">No past pages.</p>}
                    {entries.map(e => (
                        <div
                            key={e.key}
                            className={`entry-item ${e.dateStr === currentDate ? 'active' : ''}`}
                            onClick={() => {
                                onSelectDate(e.dateStr);
                                // Optional: close sidebar on mobile? setIsOpen(false);
                            }}
                        >
                            {e.display}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .sidebar-toggle {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 300;
            background: transparent;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--color-dim);
            transition: color 0.3s;
        }
        .sidebar-toggle:hover { color: var(--color-text); }
        
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 250px;
            background: #f9f9f9;
            box-shadow: 2px 0 10px rgba(0,0,0,0.05);
            z-index: 250;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            padding: 80px 20px 20px 20px;
            font-family: var(--font-ui);
            overflow-y: auto;
        }
        .sidebar.open {
            transform: translateX(0);
        }
        .sidebar h3 {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--color-dim);
            margin-bottom: 2rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #eee;
        }
        .entry-item {
            padding: 10px;
            cursor: pointer;
            border-radius: 4px;
            color: var(--color-text);
            margin-bottom: 4px;
            transition: background 0.2s;
        }
        .entry-item:hover {
            background: #eee;
        }
        .entry-item.active {
            background: var(--color-accent);
            color: white;
        }
        .empty {
            color: #aaa;
            font-style: italic;
            font-size: 0.9rem;
        }
      `}</style>
        </>
    );
};

export default Sidebar;
