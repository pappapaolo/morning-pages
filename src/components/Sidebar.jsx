import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';

const Sidebar = ({ currentDate, onSelectDate, onOpenAbout, isOpen, onClose }) => {
    const [entries, setEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [importStatus, setImportStatus] = useState(null);
    const fileInputRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadEntries();
            // Focus search input when sidebar opens
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery(''); // Clear search when closed
        }
    }, [isOpen]);

    const loadEntries = async () => {
        const keys = await storage.getAllKeys();
        const dateKeys = keys.filter(k => k.startsWith('morning_page_')).sort().reverse(); // Newest first

        const processed = await Promise.all(dateKeys.map(async (k) => {
            const dateStr = k.replace('morning_page_', '');
            const content = await storage.getEntry(dateStr);
            return {
                key: k,
                dateStr: dateStr,
                display: new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                content: content || ''
            };
        }));
        setEntries(processed);
    };

    const handleExport = async () => {
        try {
            const data = await storage.exportAllData();
            const timestamp = new Date().toISOString().split('T')[0];
            storage.downloadBackup(data, `morning-pages-backup-${timestamp}.json`);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const count = await storage.importData(data);
            setImportStatus(`Imported ${count} entries`);
            loadEntries();
            setTimeout(() => setImportStatus(null), 3000);
        } catch (err) {
            setImportStatus('Import failed: invalid file');
            setTimeout(() => setImportStatus(null), 3000);
        }

        e.target.value = '';
    };

    // Filter entries based on search query
    const filteredEntries = entries.filter(e => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            e.display.toLowerCase().includes(query) ||
            e.content.toLowerCase().includes(query)
        );
    });

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div className="sidebar-overlay" onClick={onClose} />
            )}

            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                {/* Search Bar */}
                <div className="search-container">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="search-input"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            &times;
                        </button>
                    )}
                </div>

                <div className="entry-list">
                    {filteredEntries.length === 0 && (
                        <p className="empty">
                            {searchQuery ? 'No matching entries.' : 'No past pages.'}
                        </p>
                    )}
                    {filteredEntries.map(e => (
                        <div
                            key={e.key}
                            className={`entry-item ${e.dateStr === currentDate ? 'active' : ''}`}
                            onClick={() => {
                                onSelectDate(e.dateStr);
                                if (onClose) onClose();
                            }}
                        >
                            {e.display}
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="backup-buttons">
                        <button className="backup-btn" onClick={handleExport}>Export Backup</button>
                        <button className="backup-btn" onClick={handleImportClick}>Import Backup</button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportFile}
                            accept=".json"
                            style={{ display: 'none' }}
                        />
                    </div>
                    {importStatus && <div className="import-status">{importStatus}</div>}
                    <button className="about-link" onClick={onOpenAbout}>About & SEO</button>
                </div>
            </div>

            <style>{`
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 200;
            animation: fadeIn 0.2s ease;
        }
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 280px;
            background: var(--color-bg-sidebar);
            box-shadow: 5px 0 30px rgba(0,0,0,0.1);
            z-index: 250;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            padding: 20px;
            font-family: var(--font-ui);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            border-right: 1px solid rgba(0,0,0,0.05);
        }
        .sidebar.open {
            transform: translateX(0);
        }
        .search-container {
            position: relative;
            margin-bottom: 1rem;
        }
        .search-input {
            width: 100%;
            padding: 10px 35px 10px 12px;
            border: none;
            border-radius: 8px;
            background: var(--color-bg-hover);
            color: var(--color-text);
            font-family: var(--font-ui);
            font-size: 0.9rem;
            outline: none;
            transition: background 0.2s;
        }
        .search-input:focus {
            background: var(--color-bg-active);
        }
        .search-input::placeholder {
            color: var(--color-dim);
        }
        .search-clear {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--color-dim);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 4px 8px;
            line-height: 1;
        }
        .search-clear:hover {
            color: var(--color-text);
        }
        .entry-list {
            flex: 1;
            overflow-y: auto;
        }
        .entry-item {
            padding: 10px 12px;
            cursor: pointer;
            border-radius: 6px;
            color: var(--color-text);
            margin-bottom: 4px;
            transition: background 0.2s;
            font-size: 0.9rem;
        }
        .entry-item:hover {
            background: var(--color-bg-hover);
        }
        .entry-item.active {
            background: transparent;
            border-left: 2px solid var(--color-dim);
            padding-left: 10px;
            color: var(--color-text);
        }
        .empty {
            color: var(--color-dim);
            font-style: italic;
            font-size: 0.9rem;
            text-align: center;
            padding: 2rem 0;
        }
        .sidebar-footer {
            margin-top: auto;
            border-top: 1px solid var(--color-border);
            padding-top: 1rem;
        }
        .about-link {
            background: none;
            border: none;
            color: var(--color-dim);
            text-decoration: underline;
            cursor: pointer;
            font-size: 0.8rem;
            padding: 0;
        }
        .backup-buttons {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .backup-btn {
            background: var(--color-bg-hover);
            border: 1px solid var(--color-border);
            color: var(--color-text);
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            font-family: var(--font-ui);
            transition: background 0.2s;
        }
        .backup-btn:hover {
            background: var(--color-bg-active);
        }
        .import-status {
            font-size: 0.8rem;
            color: var(--color-success);
            margin-bottom: 0.5rem;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
      `}</style>
        </>
    );
};

export default Sidebar;
