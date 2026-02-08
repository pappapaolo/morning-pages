import React, { useState, useEffect, useRef } from 'react';

const StatsDisplay = ({ wordCount, startTime }) => {
  const [wpm, setWpm] = useState(0);
  const [elapsed, setElapsed] = useState('0:00');
  const typingHistoryRef = useRef([]);

  // Track typing history for rolling WPM calculation
  useEffect(() => {
    const now = Date.now();
    const windowMs = 15000; // 15 second window

    // Filter old entries and add new snapshot
    typingHistoryRef.current = [
      ...typingHistoryRef.current.filter(h => now - h.timestamp < windowMs),
      { timestamp: now, wordCount }
    ];
  }, [wordCount]);

  // Calculate rolling WPM from recent history
  const calculateRollingWpm = () => {
    const history = typingHistoryRef.current;
    if (history.length < 2) return 0;

    const oldest = history[0];
    const newest = history[history.length - 1];
    const wordsTyped = newest.wordCount - oldest.wordCount;
    const minutes = (newest.timestamp - oldest.timestamp) / 60000;

    return minutes > 0 ? Math.round(wordsTyped / minutes) : 0;
  };

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();

      // Use rolling window WPM calculation
      setWpm(calculateRollingWpm());

      const totalSeconds = Math.floor((now - startTime) / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);

    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, wordCount]);

  return (
    <div className="stats-container">
      <span className="stat-item">{wordCount} words</span>
      <span className="separator">•</span>
      <span className="stat-item">{wpm} wpm</span>
      <span className="separator">•</span>
      <span className="stat-item">{elapsed}</span>

      <style>{`
        .stats-container {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
          color: var(--color-dim);
          font-family: var(--font-sans);
          font-size: 0.75rem; /* Tiny */
          opacity: 0.4; /* Low opacity */
          transition: opacity 0.3s;
          z-index: 100;
          pointer-events: auto;
        }
        .stats-container:hover {
            opacity: 1;
        }
        .separator {
            font-size: 0.5rem;
            opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default StatsDisplay;
