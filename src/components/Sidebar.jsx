import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import AuthButton from './AuthButton';

const Sidebar = ({ currentDate, onSelectDate, onOpenAbout, isOpen, onClose, onOpenSearch, entries: propEntries }) => {
    const { isConfigured: isFirebaseConfigured } = useAuth();
    const [entries, setEntries] = useState([]);
    const [importStatus, setImportStatus] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadEntries();
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
                    day: 'numeric'
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

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            {/* Sidebar Header with Logo and Close Button */}
            <div className="sidebar-header">
                <span className="sidebar-logo">MP</span>
                <button className="sidebar-close-btn" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Search Button */}
            <button className="search-button" onClick={onOpenSearch}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <span>Search pages</span>
                <span className="search-shortcut">&#8984;K</span>
            </button>

            <div className="entry-list">
                {entries.length === 0 && (
                    <p className="empty">No past pages.</p>
                )}
                {entries.map(e => (
                    <div
                        key={e.key}
                        className={`entry-item ${e.dateStr === currentDate ? 'active' : ''}`}
                        onClick={() => {
                            onSelectDate(e.dateStr);
                        }}
                    >
                        {e.display}
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                {isFirebaseConfigured && (
                    <div className="sidebar-auth">
                        <span className="auth-cta">Backup your progress</span>
                        <AuthButton />
                    </div>
                )}
                <div className="backup-buttons">
                    <button className="backup-btn" onClick={handleExport}>Export</button>
                    <span className="backup-separator">·</span>
                    <button className="backup-btn" onClick={handleImportClick}>Import</button>
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

            <style>{`
        .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 280px;
            background: #fafafa;
            border-right: 0.5px solid rgba(0, 0, 0, 0.06);
            z-index: 150;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            padding: 20px;
            font-family: var(--font-ui);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        @media (prefers-color-scheme: dark) {
            .sidebar {
                background: #1a1a1a;
                border-right: 0.5px solid rgba(255, 255, 255, 0.06);
            }
        }
        .sidebar.open {
            transform: translateX(0);
        }
        .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
        }
        .sidebar-logo {
            font-family: var(--font-body);
            font-size: 1.25rem;
            font-weight: 500;
            color: var(--color-text);
            letter-spacing: -0.5px;
        }
        .sidebar-close-btn {
            background: transparent;
            border: none;
            color: var(--color-dim);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        }
        .sidebar-close-btn:hover {
            color: var(--color-text);
        }
        .search-button {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            border-radius: 8px;
            background: var(--color-bg-hover);
            color: var(--color-dim);
            font-family: var(--font-ui);
            font-size: 0.9rem;
            cursor: pointer;
            transition: background 0.2s, color 0.2s;
            margin-bottom: 1rem;
        }
        .search-button:hover {
            background: var(--color-bg-active);
            color: var(--color-text);
        }
        .search-shortcut {
            margin-left: auto;
            font-size: 0.75rem;
            opacity: 0.6;
            background: var(--color-bg);
            padding: 2px 6px;
            border-radius: 4px;
        }
        .entry-list {
            flex: 1;
            overflow-y: auto;
        }
        .entry-item {
            padding: 10px 12px;
            cursor: pointer;
            border-radius: 12px;
            color: var(--color-text);
            margin-bottom: 4px;
            transition: background 0.2s;
            font-size: 0.9rem;
        }
        .entry-item:hover {
            background: var(--color-bg-hover);
        }
        .entry-item.active {
            background: var(--color-bg);
            color: var(--color-text);
            font-weight: 500;
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
        .sidebar-auth {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--color-border);
        }
        .auth-cta {
            font-size: 0.75rem;
            color: var(--color-dim);
        }
        .backup-buttons {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .backup-separator {
            color: var(--color-dim);
            font-size: 0.75rem;
        }
        .backup-btn {
            background: transparent;
            border: none;
            color: var(--color-dim);
            padding: 0;
            cursor: pointer;
            font-size: 0.75rem;
            font-family: var(--font-ui);
            text-decoration: underline;
            transition: color 0.2s;
        }
        .backup-btn:hover {
            color: var(--color-text);
        }
        .import-status {
            font-size: 0.8rem;
            color: var(--color-success);
            margin-bottom: 0.5rem;
        }
      `}</style>
        </div>
    );
};

export default Sidebar;
