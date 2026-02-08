import React, { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import AuthButton from './AuthButton';

const Sidebar = ({
    currentDate,
    onSelectDate,
    onOpenAbout,
    isOpen,
    isDesktop = false,
    onClose,
    onOpenSearch,
    syncStatus,
    lastSync,
    onImportComplete,
}) => {
    const [entries, setEntries] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    const loadEntries = async () => {
        const keys = await storage.getAllKeys();
        const dateKeys = keys.filter(k => k.startsWith('morning_page_')).sort().reverse();

        const processed = await Promise.all(dateKeys.map(async (k) => {
            const dateStr = k.replace('morning_page_', '');
            const content = await storage.getEntry(dateStr);
            return {
                key: k,
                dateStr,
                display: new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }),
                content: content || ''
            };
        }));

        setEntries(processed);
    };

    useEffect(() => {
        if (!(isOpen || isDesktop)) return undefined;

        const timer = setTimeout(() => {
            loadEntries();
        }, 0);

        return () => clearTimeout(timer);
    }, [isOpen, isDesktop, currentDate]);

    const handleExportBackup = async () => {
        setIsExporting(true);
        try {
            const data = await storage.exportAllData();
            const date = new Date().toISOString().slice(0, 10);
            storage.downloadBackup(data, `morning-pages-backup-${date}.json`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''} ${isDesktop ? 'desktop' : ''}`}>
            <div className="sidebar-header">
                <span className="sidebar-logo">MP</span>
                {!isDesktop && (
                    <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            <button
                className="search-button"
                onClick={() => {
                    onOpenSearch();
                    if (!isDesktop) onClose();
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                </svg>
                <span>Search pages</span>
                <span className="search-shortcut">⌘K</span>
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
                            if (!isDesktop) onClose();
                        }}
                    >
                        {e.display}
                    </div>
                ))}
            </div>

            <div className="sidebar-footer">
                <button className="local-export-button" onClick={handleExportBackup} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export local backup'}
                </button>
                <div className="sidebar-auth">
                    <AuthButton
                        syncStatus={syncStatus}
                        lastSync={lastSync}
                        onImportComplete={onImportComplete}
                    />
                </div>
                <button className="about-link" onClick={onOpenAbout}>About & SEO</button>
            </div>

            <style>{`
        .sidebar {
            position: fixed;
            top: 6px;
            left: 0;
            height: calc(100vh - 6px);
            width: min(86vw, 320px);
            background: var(--color-bg-sidebar);
            border-right: 1px solid var(--color-border);
            z-index: 180;
            transform: translateX(-104%);
            transition: transform 0.25s ease;
            padding: 18px;
            font-family: var(--font-ui);
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-sidebar);
        }
        .sidebar.open,
        .sidebar.desktop {
            transform: translateX(0);
        }
        .sidebar.desktop {
            box-shadow: none;
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
        .local-export-button {
            width: 100%;
            margin-bottom: 0.75rem;
            padding: 0.55rem 0.75rem;
            border-radius: 8px;
            border: 1px solid var(--color-border);
            background: var(--color-bg);
            color: var(--color-text);
            font-family: var(--font-ui);
            font-size: 0.8rem;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .local-export-button:hover {
            background: var(--color-bg-hover);
        }
        .local-export-button:disabled {
            opacity: 0.65;
            cursor: default;
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
            margin-bottom: 1rem;
        }
        @media (max-width: 760px) {
            .search-shortcut {
                display: none;
            }
        }
        @media (max-width: 600px) {
            .sidebar {
                width: min(90vw, 320px);
                padding: 14px;
            }
        }
      `}</style>
        </div>
    );
};

export default Sidebar;
