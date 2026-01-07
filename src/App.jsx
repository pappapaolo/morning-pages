import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Editor from './components/Editor';
import ProgressBar from './components/ProgressBar';
import StatsDisplay from './components/StatsDisplay';
import Sidebar from './components/Sidebar';
import AboutModal from './components/AboutModal';
import { storage } from './services/storage';
import { Analytics } from "@vercel/analytics/react";
import RescueModal from './components/RescueModal';

function App() {
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
  const [showRescueModal, setShowRescueModal] = useState(false);
  const [programProgress, setProgramProgress] = useState({ week: 1, day: 1 });

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

      setIsLoading(false);
    };
    init();
  }, [currentDateKey]);

  // Rescue Check (Run once on mount)
  useEffect(() => {
    const checkRescue = async () => {
      // Logic: If today is "fresh" launch (not just a date switch), check yesterday
      // For simplicity, we just check "yesterday" relative to the INITIAL load date
      // We already have currentDateKey initialized to "today" on mount.

      // Calculate yesterday
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      // Check if yesterday is incomplete
      const yesterdayText = await storage.getEntry(yesterdayStr);
      const yesterdayCount = calculateWordCount(yesterdayText);

      // If incomplete (< 750 words) and not empty (started but failed) OR empty (missed entirely)
      // Actually, user wants to save streak. So if < 750, offer rescue.
      if (yesterdayCount < 750) {
        setShowRescueModal(true);
      }
    };

    checkRescue();
  }, []); // Run once

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


    const timeoutId = setTimeout(() => {
      storage.saveEntry(currentDateKey, text);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [text, wordCount, isLoading, milestonesReached, currentDateKey, startTime]);

  const handleTextChange = (newText) => {
    setText(newText);
    setWordCount(calculateWordCount(newText));
  };

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Derive display string from the locked currentDateKey
  // We have YYYY-MM-DD, need to create a date object safely
  // Adding 'T12:00:00' to avoid timezone shifts when parsing YYYY-MM-DD
  const dateObj = new Date(currentDateKey + 'T12:00:00');
  const displayDateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (isLoading && !text) return <div className="loading">Loading...</div>; // Show loading if no text yet

  const isDone = wordCount >= 750;

  const handleRescue = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    setIsLoading(true);
    setText(''); // Clear immediately to prevent overwrite
    setCurrentDateKey(yesterdayStr);
    setShowRescueModal(false);
  };

  return (
    <div className="app-container">
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showRescueModal && (
        <RescueModal
          onRescue={handleRescue}
          onSkip={() => setShowRescueModal(false)}
        />
      )}

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

          setCurrentDateKey(dateStr);
        }}
        onOpenAbout={() => setShowAbout(true)}
      />

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {showToast}
      </div>

      <header className="header">
        <h1 className="title">Morning Pages</h1>
        <div className="header-right">
          <div className="date-display">{displayDateStr}</div>
          <button
            className="history-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="History"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v5h5" />
              <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              <path d="M12 7v5l4 2" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        <Editor
          value={text}
          onChange={handleTextChange}
          programProgress={programProgress}
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
        .history-toggle {
            background: transparent;
            border: none;
            color: var(--color-icon);
            width: 20px;
            height: 20px;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.3s;
        }
        .history-toggle:hover {
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
