import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import Editor from './components/Editor';
import ProgressBar from './components/ProgressBar';
import StatsDisplay from './components/StatsDisplay';
import Sidebar from './components/Sidebar';
import AboutModal from './components/AboutModal';
import FlameIcon from './components/FlameIcon';
import Keyboard from './components/Keyboard';
import AuthButton from './components/AuthButton';
import SearchModal from './components/SearchModal';
import { storage } from './services/storage';
import { syncService } from './services/sync';
import { useAuth } from './contexts/AuthContext';
import { Analytics } from "@vercel/analytics/react";

function App() {
  // Auth state
  const { user, isConfigured: isFirebaseConfigured } = useAuth();

  // Sync state
  const [syncStatus, setSyncStatus] = useState(null); // 'syncing', 'synced', 'error', 'offline'
  const [lastSync, setLastSync] = useState(null);

  // Track last local update to prevent echo from real-time listener
  const lastLocalUpdateRef = useRef(null);

  // Initialize date once on mount to lock the session, preventing midnight shifts
  const [currentDateKey, setCurrentDateKey] = useState(() => new Date().toLocaleDateString('en-CA'));

  const [text, setText] = useState('');
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

      const savedText = await storage.getEntry(currentDateKey);

      // Always set text, even if empty, to ensure clean state
      setText(savedText || '');

      const count = calculateWordCount(savedText || '');
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
    const localContent = await storage.getEntry(dateStr);
    const cloudContent = cloudEntry.content || '';

    // Only update if cloud is actually different and newer
    if (cloudContent !== localContent) {
      // Save to local storage
      await storage.saveEntry(dateStr, cloudContent);

      // If this is the current date being edited, update the UI
      if (dateStr === currentDateKey) {
        // Check if cloud is newer than what we have
        const localData = await storage.exportAllData();
        const localEntry = localData.entries[dateStr];
        const localTime = localEntry?.lastUpdated || 0;
        const cloudTime = cloudEntry.lastUpdated || 0;

        if (cloudTime > localTime) {
          setText(cloudContent);
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
      const savedText = await storage.getEntry(currentDateKey);
      setText(savedText || '');
      setWordCount(calculateWordCount(savedText || ''));
      const streakInfo = await storage.getStreak();
      setStreak(streakInfo.current);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
    }
  }, [user, isFirebaseConfigured, currentDateKey]);

  // Trigger sync when user logs in and set up real-time listener
  useEffect(() => {
    if (user && isFirebaseConfigured) {
      handleSync();

      // Subscribe to real-time updates
      const unsubscribe = syncService.subscribeToUpdates(user.uid, handleRemoteUpdate);

      return () => {
        unsubscribe();
      };
    } else {
      setSyncStatus(null);
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

    // Set initial status
    if (!syncService.isOnline()) {
      setSyncStatus('offline');
    }

    return unsubscribe;
  }, []);

  // Handler for import completion - reload current entry
  const handleImportComplete = useCallback(async () => {
    const savedText = await storage.getEntry(currentDateKey);
    setText(savedText || '');
    setWordCount(calculateWordCount(savedText || ''));
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

    if (!startTime && text.length > 0) {
      setStartTime(Date.now());
      // Track how many words we started with to calculate WPM correctly for *this* session
      setStartWordCount(wordCount);
    }

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
      await storage.saveEntry(currentDateKey, text);

      // Sync to cloud if logged in
      if (user && isFirebaseConfigured) {
        try {
          const entry = { content: text, lastUpdated: Date.now() };
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
          }
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [text, wordCount, isLoading, milestonesReached, currentDateKey, startTime, user, isFirebaseConfigured]);

  const handleTextChange = (newText) => {
    setText(newText);
    setWordCount(calculateWordCount(newText));
  };

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    setIsViewingYesterday(false);
    setCurrentDateKey(dateStr);
    setShowSearch(false);
  };

  // Keyboard State (persisted to localStorage)
  const [showKeyboard, setShowKeyboard] = useState(() => {
    return localStorage.getItem('showKeyboard') === 'true';
  });

  const toggleKeyboard = () => {
    const newValue = !showKeyboard;
    setShowKeyboard(newValue);
    localStorage.setItem('showKeyboard', String(newValue));
  };

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

  if (isLoading && !text) return <div className="loading">Loading...</div>; // Show loading if no text yet

  const isDone = wordCount >= 750;

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}


      <ProgressBar current={wordCount} target={750} />

      <Sidebar
        currentDate={currentDateKey}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectDate={async (dateStr) => {
          // Update the current context to the selected date
          // This allows viewing/editing past entries essentially by "traveling" to that date

          // FIX: Set loading and clear text BEFORE changing key to prevent race condition
          setIsLoading(true);
          setText('');

          // Reset yesterday mode when user manually selects a different date
          setIsViewingYesterday(false);
          setCurrentDateKey(dateStr);
        }}
        onOpenAbout={() => setShowAbout(true)}
        onOpenSearch={handleOpenSearch}
      />

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
        className="hamburger-menu"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title="Menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

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
          <AuthButton
            syncStatus={syncStatus}
            lastSync={lastSync}
            onImportComplete={handleImportComplete}
          />
        </div>
      </header>

      <main>
        <Editor
          value={text}
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
        <div className={`spacer ${showKeyboard ? 'with-keyboard' : ''}`}></div>
      </main>

      <Keyboard isVisible={showKeyboard} onToggle={toggleKeyboard} />

      <style>{`
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
            z-index: 100;
            background: transparent;
            border: none;
            color: var(--color-icon);
            width: 24px;
            height: 24px;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.3s;
        }
        .hamburger-menu:hover {
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
            font-family: var(--font-sans);
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
        .spacer.with-keyboard {
            height: calc(50vh + 180px);
        }
        
        /* Mobile adjustment for date display if needed */
        @media (max-width: 600px) {
            .date-display {
                font-size: 0.9rem; /* Smaller date on mobile */
            }
        }
      `}</style>
      <Analytics />
    </div>
  );
}

export default App;
