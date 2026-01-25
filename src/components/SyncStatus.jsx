import React from 'react';

const SyncStatus = ({ status, lastSync, errorMessage }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return (
          <svg className="sync-icon spinning" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9" />
          </svg>
        );
      case 'synced':
        return (
          <svg className="sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg className="sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="sync-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-dim)" strokeWidth="2">
            <path d="M2 20h.01" />
            <path d="M7 20v-4" />
            <path d="M12 20v-8" />
            <path d="M17 20v-4" />
            <path d="M22 4 2 22" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!status) return null;

  const getTitle = () => {
    if (status === 'error' && errorMessage) {
      return `Sync error: ${errorMessage}`;
    }
    if (lastSync) {
      return `Last sync: ${new Date(lastSync).toLocaleTimeString()}`;
    }
    return '';
  };

  return (
    <div className="sync-status" title={getTitle()}>
      {getStatusIcon()}
      <style>{`
        .sync-status {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sync-icon {
          display: block;
        }
        .sync-icon.spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SyncStatus;
