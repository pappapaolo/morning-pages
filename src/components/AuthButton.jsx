import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';

const AuthButton = ({ onSignIn, onSignOut, syncStatus, lastSync, onImportComplete }) => {
  const { user, loading, error, isConfigured, signInWithGoogle, signOut, clearError } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (!isConfigured) {
    return (
      <div className="auth-not-configured">
        <span>Firebase not configured</span>
        <style>{`
          .auth-not-configured {
            font-size: 0.75rem;
            color: var(--color-dim);
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return <div className="auth-loading">...</div>;
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      if (onSignIn) onSignIn();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      setMenuOpen(false);
      await signOut();
      if (onSignOut) onSignOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleExport = async () => {
    try {
      const data = await storage.exportAllData();
      const date = new Date().toISOString().split('T')[0];
      storage.downloadBackup(data, `morning-pages-backup-${date}.json`);
      setMenuOpen(false);
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
      await storage.importData(data);
      setMenuOpen(false);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      console.error('Import failed:', err);
      alert('Failed to import backup: ' + err.message);
    }
    // Reset input
    e.target.value = '';
  };

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case 'syncing':
        return { color: 'var(--color-dim)', text: 'Syncing...' };
      case 'synced':
        return { color: 'var(--color-success, #81c784)', text: 'Synced' };
      case 'error':
        return { color: 'var(--color-accent)', text: 'Sync error' };
      case 'offline':
        return { color: 'var(--color-dim)', text: 'Offline' };
      default:
        return { color: 'var(--color-dim)', text: 'Not synced' };
    }
  };

  if (user) {
    const syncInfo = getSyncStatusInfo();
    return (
      <div className="auth-user" ref={menuRef}>
        <img
          src={user.photoURL || '/default-avatar.png'}
          alt={user.displayName || 'User'}
          className="user-avatar"
          onClick={() => setMenuOpen(!menuOpen)}
        />

        {menuOpen && (
          <div className="profile-menu">
            <div className="profile-header">
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt={user.displayName || 'User'}
                className="profile-avatar"
              />
              <div className="profile-info">
                <div className="profile-name">{user.displayName || 'User'}</div>
                <div className="profile-email">{user.email}</div>
              </div>
            </div>

            <div className="menu-divider" />

            <div className="sync-status-row">
              <span className="sync-dot" style={{ backgroundColor: syncInfo.color }} />
              <span className="sync-text">{syncInfo.text}</span>
              {lastSync && syncStatus === 'synced' && (
                <span className="sync-time">
                  {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="menu-divider" />

            <button className="menu-item" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export data
            </button>

            <button className="menu-item" onClick={handleImportClick}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import data
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              style={{ display: 'none' }}
            />

            <div className="menu-divider" />

            <button className="menu-item menu-item-danger" onClick={handleSignOut}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}

        <style>{`
          .auth-user {
            position: relative;
            display: flex;
            align-items: center;
          }
          .user-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .user-avatar:hover {
            opacity: 0.8;
          }
          .profile-menu {
            position: absolute;
            bottom: calc(100% + 8px);
            left: 0;
            background: var(--color-bg);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            min-width: 240px;
            z-index: 1000;
            overflow: hidden;
          }
          .profile-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
          }
          .profile-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
          }
          .profile-info {
            flex: 1;
            min-width: 0;
          }
          .profile-name {
            font-family: var(--font-ui);
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--color-text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .profile-email {
            font-family: var(--font-ui);
            font-size: 0.75rem;
            color: var(--color-dim);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .menu-divider {
            height: 1px;
            background: var(--color-border);
            margin: 0;
          }
          .sync-status-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            font-family: var(--font-ui);
            font-size: 0.8rem;
          }
          .sync-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .sync-text {
            color: var(--color-text);
          }
          .sync-time {
            color: var(--color-dim);
            margin-left: auto;
          }
          .menu-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            padding: 12px 16px;
            background: none;
            border: none;
            color: var(--color-text);
            font-family: var(--font-ui);
            font-size: 0.85rem;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s;
          }
          .menu-item:hover {
            background: var(--color-bg-hover, rgba(255,255,255,0.05));
          }
          .menu-item svg {
            flex-shrink: 0;
            opacity: 0.7;
          }
          .menu-item-danger {
            color: var(--color-accent);
          }
          .menu-item-danger svg {
            stroke: var(--color-accent);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {error && (
        <div className="auth-error" onClick={clearError}>
          {error}
        </div>
      )}
      <button className="google-sign-in-btn" onClick={handleSignIn}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span>Sign in with Google</span>
      </button>
      <style>{`
        .auth-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }
        .google-sign-in-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.6rem 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text);
          font-family: var(--font-ui);
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .google-sign-in-btn:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-dim);
        }
        .auth-loading {
          color: var(--color-dim);
          font-size: 0.8rem;
        }
        .auth-error {
          font-size: 0.7rem;
          color: var(--color-accent);
          cursor: pointer;
          max-width: 200px;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
};

export default AuthButton;
