import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';

const Sidebar = ({ currentDate, onSelectDate, onOpenAbout, isOpen, onClose }) => {
    const [entries, setEntries] = useState([]);
    const [importStatus, setImportStatus] = useState(null);
    const fileInputRef = useRef(null);

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
            loadEntries(); // Refresh the entry list
            setTimeout(() => setImportStatus(null), 3000);
        } catch (err) {
            setImportStatus('Import failed: invalid file');
            setTimeout(() => setImportStatus(null), 3000);
        }

        // Reset file input
        e.target.value = '';
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="entry-list">
                    {entries.length === 0 && <p className="empty">No past pages.</p>}
                    {entries.map(e => (
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
        .sidebar {
            position: fixed;
            top: 0;
            right: 0; /* Align to right */
            height: 100vh;
            width: 250px;
            background: var(--color-bg-sidebar); /* Lighter than main bg */
            box-shadow: -5px 0 30px rgba(0,0,0,0.05); /* Subtle shadow on left */
            z-index: 250;
            transform: translateX(100%); /* Slide out to right */
            transition: transform 0.3s ease;
            padding: 80px 20px 20px 20px;
            font-family: var(--font-ui);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            border-left: 1px solid rgba(0,0,0,0.05); /* Subtle separator */
        }
        .sidebar.open {
            transform: translateX(0);
        }
        .entry-list {
            flex: 1;
            overflow-y: auto;
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
            background: var(--color-bg-hover);
        }
        .entry-item.active {
            background: var(--color-bg-active);
            color: var(--color-text);
        }
        .empty {
            color: var(--color-dim);
            font-style: italic;
            font-size: 0.9rem;
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
            border-radius: 4px;
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
      `}</style>
        </>
    );
};

export default Sidebar;
