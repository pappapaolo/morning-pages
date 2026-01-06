import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Editor from './components/Editor';
import ProgressBar from './components/ProgressBar';
import StatsDisplay from './components/StatsDisplay';
import Sidebar from './components/Sidebar';
import { storage } from './services/storage';

const TODAY_DATE_KEY = new Date().toLocaleDateString('en-CA');

function App() {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [streak, setStreak] = useState(0);

  // Milestones tracking to avoid re-triggering
  const [milestonesReached, setMilestonesReached] = useState(new Set());
  const [showToast, setShowToast] = useState(null); // Message or null

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
      const savedText = await storage.getEntry(TODAY_DATE_KEY);
      if (savedText) {
        setText(savedText);
        const count = calculateWordCount(savedText);
        setWordCount(count);
        // Re-populate milestones so we don't spam toasts on reload
        const reached = new Set();
        if (count >= 250) reached.add(250);
        if (count >= 500) reached.add(500);
        if (count >= 750) reached.add(750);
        setMilestonesReached(reached);
      }

      const streakInfo = await storage.getStreak();
      setStreak(streakInfo.current);

      setIsLoading(false);
    };
    init();
  }, []);

  // Save & Logic
  useEffect(() => {
    if (isLoading) return;

    if (!startTime && text.length > 0) {
      setStartTime(Date.now());
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
          storage.updateStreak(TODAY_DATE_KEY).then(s => setStreak(s.current));
        }
      }
    };

    checkMilestone(250, "1 Page Complete");
    checkMilestone(500, "2 Pages Complete");
    checkMilestone(750, "3 Pages - Morning Pages Complete!");


    const timeoutId = setTimeout(() => {
      storage.saveEntry(TODAY_DATE_KEY, text);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [text, wordCount, isLoading, milestonesReached]);

  const handleTextChange = (newText) => {
    setText(newText);
    setWordCount(calculateWordCount(newText));
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (isLoading) return <div className="loading">Loading...</div>;

  const isDone = wordCount >= 750;

  return (
    <div className="app-container">
      <ProgressBar current={wordCount} target={750} />

      <Sidebar
        currentDate={TODAY_DATE_KEY}
        onSelectDate={async (dateStr) => {
          // Very simple routing: load content into editor
          // Ideal world: read-only mode for past days?
          // For now: just load it.
          const content = await storage.getEntry(dateStr);
          setText(content || '');
          setWordCount(calculateWordCount(content || ''));
          // If it's not today, maybe disable saving?
          // For MVP: keep it simple.
        }}
      />

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {showToast}
      </div>

      <header className="header">
        <h1 className="title">Morning Pages</h1>
        <div className="date-display">{todayStr}</div>
      </header>

      <main>
        <Editor value={text} onChange={handleTextChange} />

        {isDone && (
          <div className="done-message fade-in">
            <h2>✨ Done for the day. Come back tomorrow.</h2>
            <p>Streak: {streak} days</p>
          </div>
        )}

        <StatsDisplay
          wordCount={wordCount}
          streak={streak}
          startTime={startTime}
        />
      </main>

      <style>{`
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #333;
            color: #fff;
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
            text-align: center;
            color: var(--color-success);
            margin-top: 2rem;
            margin-bottom: 2rem;
            font-family: var(--font-ui);
            padding: 2rem;
            background: #f1f8e9;
            border-radius: 8px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
        }
        .title {
            text-transform: none; /* Normal case, not uppercase */
            font-size: 1.5rem;
            color: var(--color-text);
        }
        .date-display {
            font-family: var(--font-ui);
            color: #ccc;
            font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

export default App;
