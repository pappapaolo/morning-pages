import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import Editor from './components/Editor';
import ProgressBar from './components/ProgressBar';
import StatsDisplay from './components/StatsDisplay';
import Sidebar from './components/Sidebar';
import AboutModal from './components/AboutModal';
import FlameIcon from './components/FlameIcon';
import SearchModal from './components/SearchModal';
import { storage } from './services/storage';
import { syncService } from './services/sync';
import { useAuth } from './contexts/auth-context';
import { Analytics } from '@vercel/analytics/react';

function App() {
  // Auth state
  const { user, isConfigured: isFirebaseConfigured } = useAuth();

  // Sync state
  const [syncStatus, setSyncStatus] = useState(() => (syncService.isOnline() ? null : 'offline')); // 'syncing', 'synced', 'error', 'offline'
  const [lastSync, setLastSync] = useState(null);

  // Track last local update to prevent echo from real-time listener
  const lastLocalUpdateRef = useRef(null);

  // Initialize date once on mount to lock the session, preventing midnight shifts
  const [currentDateKey, setCurrentDateKey] = useState(() => new Date().toLocaleDateString('en-CA'));

  const [text, setText] = useState('');
  const [textHtml, setTextHtml] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [startWordCount, setStartWordCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Milestones tracking to avoid re-triggering
  const [milestonesReached, setMilestonesReached] = useState(new Set());
  const [showToast, setShowToast] = useState(null); // Message or null
  const [showAbout, setShowAbout] = useState(false);
  const [isViewingYesterday, setIsViewingYesterday] = useState(false);
  const [programProgress, setProgramProgress] = useState({ week: 1, day: 1 });
  const [totalDays, setTotalDays] = useState(1);

  const calculateWordCount = (str) => {
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const triggerToast = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Load data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true); // Ensure loading state while fetching

      // Reset session tracking when date changes
      setStartTime(null);
      setStartWordCount(0);

      const savedEntry = await storage.getEntryData(currentDateKey);
      const savedText = savedEntry.content || '';
      const savedHtml = savedEntry.contentHtml || savedText;

      // Always set text, even if empty, to ensure clean state
      setText(savedText);
      setTextHtml(savedHtml);

      const count = calculateWordCount(savedText);
      setWordCount(count);

      // Re-populate milestones
      const reached = new Set();
      if (count >= 250) reached.add(250);
      if (count >= 500) reached.add(500);
      if (count >= 750) reached.add(750);
      setMilestonesReached(reached);

      const streakInfo = await storage.getStreak();
      setStreak(streakInfo.current);

      // Calculate Program Progress
      // Find the earliest date key to establish "Day 1"
      const allKeys = await storage.getAllKeys();
      const dateKeys = allKeys
        .filter(k => k.startsWith('morning_page_'))
        .map(k => k.replace('morning_page_', ''))
        .sort(); // String sort works for YYYY-MM-DD

      let startDate = new Date(); // Default to today if no data
      if (dateKeys.length > 0) {
        startDate = new Date(dateKeys[0] + 'T12:00:00'); // No timezone shift
      }

      // Compare current selected date (currentDateKey) vs start date
      // This ensures if I look at past entries, the "Week X" context might be wrong? 
      // Actually user probably wants "My current progress" regardless of which day they are editing.
      // But contextually "Day 3" makes most sense relative to the day being edited.
      // Let's stick to "Today's" progress for now, using the current real time date, 
      // OR use the currentDateKey to show "This was Week 1 Day 3".
      // User said: "week one of 12" -> implies current status. 
      // Let's use the actual Today vs StartDate.

      const paramDate = new Date(); // Today
      const diffTime = Math.abs(paramDate - startDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const currentWeek = Math.floor(diffDays / 7) + 1;
      const currentDay = (diffDays % 7) + 1;

      setProgramProgress({ week: currentWeek, day: currentDay });
      setTotalDays(diffDays + 1);

      setIsLoading(false);
    };
    init();
  }, [currentDateKey]);

  // Auto-redirect to yesterday if incomplete (Run once on mount)
  useEffect(() => {
    const checkYesterday = async () => {
      // Get current streak first - only redirect if user has a streak to save
      const streakInfo = await storage.getStreak();

      // No streak means nothing to rescue - skip for new users
      if (streakInfo.current === 0) {
        return;
      }

      // Calculate yesterday
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      // Check if yesterday is incomplete
      const yesterdayText = await storage.getEntry(yesterdayStr);
      const yesterdayCount = calculateWordCount(yesterdayText || '');

      // Auto-redirect if yesterday is incomplete AND user has a streak to save
      if (yesterdayCount < 750) {
        setIsViewingYesterday(true);
        setCurrentDateKey(yesterdayStr);
        triggerToast(`Finish yesterday's three pages to save your ${streakInfo.current} day streak`);
      }
    };

    checkYesterday();
  }, []); // Run once

  // Handle real-time updates from other devices
  const handleRemoteUpdate = useCallback(async (dateStr, cloudEntry) => {
    // Skip if this is an echo of our own update (within 2 seconds)
    if (lastLocalUpdateRef.current &&
        lastLocalUpdateRef.current.dateStr === dateStr &&
        Date.now() - lastLocalUpdateRef.current.timestamp < 2000) {
      return;
    }

    // Get current local entry for this date
    const localEntry = await storage.getEntryData(dateStr);
    const localContent = localEntry.content || '';
    const localContentHtml = localEntry.contentHtml || localContent;
    const cloudContent = cloudEntry.content || '';
    const cloudContentHtml = cloudEntry.contentHtml || cloudContent;

    // Only update if cloud is actually different and newer
    if (cloudContent !== localContent || cloudContentHtml !== localContentHtml) {
      // Save to local storage
      await storage.saveEntry(dateStr, cloudContent, cloudContentHtml);

      // If this is the current date being edited, update the UI
      if (dateStr === currentDateKey) {
        // Check if cloud is newer than what we have
        const localData = await storage.exportAllData();
        const localEntry = localData.entries[dateStr];
        const localTime = localEntry?.lastUpdated || 0;
        const cloudTime = cloudEntry.lastUpdated || 0;

        if (cloudTime > localTime) {
          setText(cloudContent);
          setTextHtml(cloudContentHtml);
          setWordCount(calculateWordCount(cloudContent));
        }
      }
    }
  }, [currentDateKey]);

  // Sync on login and subscribe to real-time updates
  const handleSync = useCallback(async () => {
    if (!user || !isFirebaseConfigured) return;

    setSyncStatus('syncing');
    try {
      await syncService.fullSync(user.uid);
      setSyncStatus('synced');
      setLastSync(Date.now());

      // Reload current entry in case it was updated from cloud
      const savedEntry = await storage.getEntryData(currentDateKey);
      const savedText = savedEntry.content || '';
      const savedHtml = savedEntry.contentHtml || savedText;
      setText(savedText);
      setTextHtml(savedHtml);
      setWordCount(calculateWordCount(savedText));
      const streakInfo = await storage.getStreak();
      setStreak(streakInfo.current);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
      if (err?.code === 'permission-denied') {
        triggerToast('Cloud sync denied by Firestore rules. Sign in again and verify Firebase rules.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        triggerToast('Sign-in domain is not authorized in Firebase Auth settings.');
      }
    }
  }, [user, isFirebaseConfigured, currentDateKey]);

  // Trigger sync when user logs in and set up real-time listener
  useEffect(() => {
    if (user && isFirebaseConfigured) {
      const timer = setTimeout(() => {
        handleSync();
      }, 0);

      // Subscribe to real-time updates
      const unsubscribe = syncService.subscribeToUpdates(user.uid, handleRemoteUpdate);

      return () => {
        clearTimeout(timer);
        unsubscribe();
      };
    } else {
      syncService.unsubscribe();
    }
  }, [user, isFirebaseConfigured, handleSync, handleRemoteUpdate]);

  // Track online/offline status
  useEffect(() => {
    const unsubscribe = syncService.onOnlineChange((online) => {
      if (online) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    });

    return unsubscribe;
  }, []);

  // Handler for import completion - reload current entry
  const handleImportComplete = useCallback(async () => {
    const savedEntry = await storage.getEntryData(currentDateKey);
    const savedText = savedEntry.content || '';
    const savedHtml = savedEntry.contentHtml || savedText;
    setText(savedText);
    setTextHtml(savedHtml);
    setWordCount(calculateWordCount(savedText));
    const streakInfo = await storage.getStreak();
    setStreak(streakInfo.current);

    // Trigger sync to push imported data to cloud
    if (user && isFirebaseConfigured) {
      handleSync();
    }
  }, [currentDateKey, user, isFirebaseConfigured, handleSync]);

  // Save & Logic
  useEffect(() => {
    if (isLoading) return;

    // Milestones Logic
    // Pages roughly: 250, 500, 750
    const checkMilestone = (target, msg) => {
      if (wordCount >= target && !milestonesReached.has(target)) {
        triggerToast(msg);
        setMilestonesReached(prev => new Set(prev).add(target));

        // Confetti only for the final goal
        if (target === 750) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#e57373', '#81c784', '#e0e0e0']
          });
          storage.updateStreak(currentDateKey).then(s => setStreak(s.current));
        }
      }
    };

    checkMilestone(250, "1 Page Complete");
    checkMilestone(500, "2 Pages Complete");
    checkMilestone(750, "3 Pages - Morning Pages Complete!");


    const timeoutId = setTimeout(async () => {
      await storage.saveEntry(currentDateKey, text, textHtml);

      // Sync to cloud if logged in
      if (user && isFirebaseConfigured) {
        try {
          const entry = { content: text, contentHtml: textHtml, lastUpdated: Date.now() };
          // Track this update to prevent echo from real-time listener
          lastLocalUpdateRef.current = { dateStr: currentDateKey, timestamp: Date.now() };
          await syncService.syncEntry(user.uid, currentDateKey, entry);
          setSyncStatus('synced');
          setLastSync(Date.now());
        } catch (err) {
          console.error('Cloud sync failed:', err);
          // Check if offline
          if (!syncService.isOnline()) {
            setSyncStatus('offline');
          } else {
            setSyncStatus('error');
            if (err?.code === 'permission-denied') {
              triggerToast('Cloud sync blocked by Firestore permissions.');
            }
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [text, textHtml, wordCount, isLoading, milestonesReached, currentDateKey, startTime, user, isFirebaseConfigured]);

  const handleTextChange = ({ text: newText = '', html: newHtml = '' }) => {
    const safeText = newText || '';
    const safeHtml = newHtml || safeText;
    const nextWordCount = calculateWordCount(safeText);

    if (!startTime && nextWordCount > 0) {
      setStartTime(Date.now());
      setStartWordCount(wordCount);
    }

    if (startTime && nextWordCount === 0) {
      setStartTime(null);
      setStartWordCount(0);
    }

    setText(safeText);
    setTextHtml(safeHtml);
    setWordCount(nextWordCount);
  };

  const desktopQuery = '(min-width: 1024px)';
  const getDesktopMatch = () => typeof window !== 'undefined' && window.matchMedia(desktopQuery).matches;
  const getInitialSidebarState = () => {
    if (typeof window === 'undefined') return false;

    const savedState = window.localStorage.getItem('sidebarOpen');
    if (savedState === 'true') return true;
    if (savedState === 'false') return false;

    return getDesktopMatch();
  };

  // Sidebar State
  const [isDesktop, setIsDesktop] = useState(getDesktopMatch);
  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState);

  // Search Modal State
  const [showSearch, setShowSearch] = useState(false);
  const [searchEntries, setSearchEntries] = useState([]);

  // Load entries for search
  const loadSearchEntries = async () => {
    const keys = await storage.getAllKeys();
    const dateKeys = keys.filter(k => k.startsWith('morning_page_')).sort().reverse();

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
    setSearchEntries(processed);
  };

  // Cmd+K listener for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        loadSearchEntries();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenSearch = () => {
    loadSearchEntries();
    setShowSearch(true);
  };

  const handleSearchSelect = async (dateStr) => {
    setIsLoading(true);
    setText('');
    setTextHtml('');
    setIsViewingYesterday(false);
    setCurrentDateKey(dateStr);
    setShowSearch(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(desktopQuery);
    const handleDesktopChange = (event) => {
      setIsDesktop(event.matches);
    };

    handleDesktopChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDesktopChange);
      return () => mediaQuery.removeEventListener('change', handleDesktopChange);
    }

    mediaQuery.addListener(handleDesktopChange);
    return () => mediaQuery.removeListener(handleDesktopChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sidebarOpen', String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    const shouldLockMobileScroll = isSidebarOpen && !isDesktop;
    document.body.classList.toggle('sidebar-open-mobile', shouldLockMobileScroll);

    return () => {
      document.body.classList.remove('sidebar-open-mobile');
    };
  }, [isSidebarOpen, isDesktop]);

  // Derive display string from the locked currentDateKey
  // We have YYYY-MM-DD, need to create a date object safely
  // Adding 'T12:00:00' to avoid timezone shifts when parsing YYYY-MM-DD
  const dateObj = new Date(currentDateKey + 'T12:00:00');

  // Natural language date display
  const getDisplayDate = () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

    if (currentDateKey === todayStr) return 'Today';
    if (currentDateKey === yesterdayStr) return 'Yesterday';
    if (currentDateKey === tomorrowStr) return 'Tomorrow';

    // For other dates, use "Jan 24" format
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const displayDateStr = getDisplayDate();

  if (isLoading && !text && !textHtml) return <div className="loading">Loading...</div>; // Show loading if no text yet

  const isDone = wordCount >= 750;

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''} ${isDesktop ? 'desktop-layout' : ''} ${isDesktop && isSidebarOpen ? 'desktop-sidebar-open' : ''}`}>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}


      <ProgressBar current={wordCount} target={750} />

      <Sidebar
        currentDate={currentDateKey}
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onClose={() => setIsSidebarOpen(false)}
        onSelectDate={async (dateStr) => {
          // Update the current context to the selected date
          // This allows viewing/editing past entries essentially by "traveling" to that date

          // FIX: Set loading and clear text BEFORE changing key to prevent race condition
          setIsLoading(true);
          setText('');
          setTextHtml('');

          // Reset yesterday mode when user manually selects a different date
          setIsViewingYesterday(false);
          setCurrentDateKey(dateStr);
        }}
        onOpenAbout={() => setShowAbout(true)}
        onOpenSearch={handleOpenSearch}
        syncStatus={syncStatus}
        lastSync={lastSync}
        onImportComplete={handleImportComplete}
      />

      {isSidebarOpen && !isDesktop && (
        <button
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {showSearch && (
        <SearchModal
          entries={searchEntries}
          onSelect={handleSearchSelect}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {showToast}
      </div>

      {/* Hamburger menu - fixed top left */}
      <button
        className={`hamburger-menu ${isSidebarOpen ? 'is-open' : ''}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        title="Menu"
      >
        {isSidebarOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        )}
      </button>

      <div className="content-shell">
        <header className="header">
          <h1 className="title">Morning Pages</h1>
          <div className="header-right">
            {streak > 0 && (
              <div className="header-streak">
                <FlameIcon size="small" />
                <span className="header-streak-count">{streak}</span>
              </div>
            )}
            <div className="date-display">{displayDateStr}</div>
          </div>
        </header>

        <main>
          <Editor
            valueHtml={textHtml}
            plainText={text}
            onChange={handleTextChange}
            programProgress={programProgress}
            totalDays={totalDays}
            isYesterday={isViewingYesterday}
          />

          {isDone && (
            <div className="done-message fade-in">
              <h2>Done for the day. Come back tomorrow.</h2>
              <p className="streak-display">Streak: {streak} days</p>
            </div>
          )}

          <StatsDisplay
            wordCount={wordCount}
            sessionWords={Math.max(0, wordCount - startWordCount)}
            streak={streak}
            startTime={startTime}
          />

          {/* Spacer to allow scrolling past the editor content */}
          <div className="spacer"></div>
        </main>
      </div>

      <style>{`
        .app-container {
            transition: padding-left 0.28s cubic-bezier(0.33, 1, 0.68, 1), max-width 0.28s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: var(--color-toast-bg);
            color: var(--color-toast-text);
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-family: var(--font-ui);
            opacity: 0;
            transition: all 0.5s ease;
            z-index: 200;
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .sidebar-backdrop {
            position: fixed;
            inset: 0;
            border: none;
            padding: 0;
            margin: 0;
            background: rgba(0, 0, 0, 0.24);
            z-index: 160;
            cursor: pointer;
        }
        .content-shell {
            width: 100%;
            max-width: var(--max-width);
            margin: 0 auto;
        }
        .done-message {
            text-align: left;
            color: var(--color-dim);
            margin-top: 2em;
            margin-bottom: 2em;
            font-family: var(--font-ui);
        }
        .done-message h2 {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            font-weight: normal;
            color: var(--color-dim);
        }
        .streak-display {
            color: var(--color-dim); 
            font-size: 1.1rem;
            margin: 0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 2rem;
            font-family: var(--font-body); 
        }
        .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .hamburger-menu {
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 190;
            background: var(--color-bg);
            border: none;
            border-radius: 8px;
            color: var(--color-icon);
            width: 34px;
            height: 34px;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s, left 0.25s ease;
        }
        .hamburger-menu:hover {
            color: var(--color-text);
        }
        .hamburger-menu.is-open {
            color: var(--color-text);
        }
        .title {
            font-family: var(--font-body);
            text-transform: none;
            font-size: 1.15rem;
            color: var(--color-text);
            margin: 0;
            font-weight: normal;
            letter-spacing: normal;
        }
        .header-streak {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }
        .header-streak-count {
            font-family: var(--font-body);
            font-size: 0.9rem;
            color: var(--color-dim);
            font-weight: 500;
        }
        .date-display {
            font-family: var(--font-body); 
            font-size: 1.15rem; 
            color: var(--color-dim);
            margin: 0;
            opacity: 0.8;
        }
        .spacer {
            height: 50vh;
            width: 100%;
        }

        @media (max-width: 1023px) {
            .header {
                padding-left: 2.6rem;
            }
            .hamburger-menu.is-open {
                opacity: 0;
                pointer-events: none;
            }
        }

        @media (min-width: 1024px) {
            .app-container.desktop-layout.desktop-sidebar-open {
                max-width: calc(var(--max-width) + 320px + 2rem);
                padding-left: calc(320px + 2rem);
            }
            .app-container.desktop-layout.desktop-sidebar-open .hamburger-menu {
                left: 340px;
            }
            .header {
                padding-left: 0;
            }
        }

        @media (max-width: 600px) {
            .hamburger-menu {
                top: 0.75rem;
                left: 0.75rem;
                width: 32px;
                height: 32px;
            }
            .header {
                margin-bottom: 1.25rem;
                padding-left: 2.3rem;
            }
            .header-right {
                gap: 0.6rem;
            }
            .title {
                font-size: 1rem;
            }
            .date-display {
                font-size: 0.95rem;
            }
        }
      `}</style>
      <Analytics />
    </div>
  );
}

export default App;
