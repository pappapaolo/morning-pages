import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';

const SearchModal = ({ entries, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter entries based on search
  const filteredEntries = entries.filter(e => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      e.display.toLowerCase().includes(query) ||
      e.content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <Command shouldFilter={false}>
          <Command.Input
            placeholder="Search pages..."
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <Command.List>
            {filteredEntries.length === 0 && (
              <Command.Empty>No results found.</Command.Empty>
            )}
            {filteredEntries.map(e => (
              <Command.Item
                key={e.key}
                value={e.dateStr}
                onSelect={() => {
                  onSelect(e.dateStr);
                  onClose();
                }}
              >
                <span className="search-item-date">{e.display}</span>
                {e.content && (
                  <span className="search-item-preview">
                    {e.content.slice(0, 60)}...
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>

      <style>{`
        .search-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 20vh;
          z-index: 1000;
          animation: fadeIn 0.15s ease;
        }

        .search-modal {
          background: var(--color-bg);
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          overflow: hidden;
          box-shadow: 0 16px 70px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--color-border);
        }

        [cmdk-root] {
          font-family: var(--font-ui);
        }

        [cmdk-input] {
          width: 100%;
          padding: 16px;
          font-size: 1rem;
          border: none;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          outline: none;
          font-family: var(--font-ui);
        }

        [cmdk-input]::placeholder {
          color: var(--color-dim);
        }

        [cmdk-list] {
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
        }

        [cmdk-item] {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: background 0.15s;
        }

        [cmdk-item][data-selected="true"] {
          background: var(--color-bg-hover);
        }

        [cmdk-item]:hover {
          background: var(--color-bg-hover);
        }

        [cmdk-empty] {
          padding: 24px;
          text-align: center;
          color: var(--color-dim);
          font-size: 0.9rem;
        }

        .search-item-date {
          font-weight: 500;
          color: var(--color-text);
        }

        .search-item-preview {
          font-size: 0.8rem;
          color: var(--color-dim);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SearchModal;
