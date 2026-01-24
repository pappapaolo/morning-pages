import React, { useState, useEffect } from 'react';

// Staggered keyboard layout with column-based touch typing colors
const KEYBOARD_ROWS = [
  { keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='], offset: 0 },
  { keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'], offset: 0.5 },
  { keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"], offset: 0.75 },
  { keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'], offset: 1.25 },
];

// Touch typing column colors (finger-based)
const getKeyColor = (key) => {
  const upperKey = key.toUpperCase();

  // Left pinky (red): ` 1 Q A Z
  if (['`', '1', 'Q', 'A', 'Z'].includes(upperKey)) return '#ff6b6b';

  // Left ring (orange): 2 W S X
  if (['2', 'W', 'S', 'X'].includes(upperKey)) return '#ffa94d';

  // Left middle (yellow): 3 E D C
  if (['3', 'E', 'D', 'C'].includes(upperKey)) return '#ffd43b';

  // Left index (green): 4 R F V, 5 T G B
  if (['4', 'R', 'F', 'V', '5', 'T', 'G', 'B'].includes(upperKey)) return '#69db7c';

  // Right index (blue): 6 Y H N, 7 U J M
  if (['6', 'Y', 'H', 'N', '7', 'U', 'J', 'M'].includes(upperKey)) return '#74c0fc';

  // Right middle (purple): 8 I K ,
  if (['8', 'I', 'K', ','].includes(upperKey)) return '#b197fc';

  // Right ring (pink): 9 O L .
  if (['9', 'O', 'L', '.'].includes(upperKey)) return '#f783ac';

  // Right pinky (gray): 0 P ; /, - [ ', = ] \
  if (['0', 'P', ';', '/', '-', '[', "'", '=', ']', '\\'].includes(upperKey)) return '#adb5bd';

  return '#adb5bd'; // Default gray
};

const SPACE_COLOR = '#74c0fc'; // Thumbs (light blue)

const Keyboard = ({ isVisible, onToggle }) => {
  const [activeKeys, setActiveKeys] = useState(new Set());

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      const key = e.key.toUpperCase();
      setActiveKeys(prev => new Set(prev).add(key));
    };

    const handleKeyUp = (e) => {
      const key = e.key.toUpperCase();
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVisible]);

  const isKeyActive = (key) => {
    const upperKey = key.toUpperCase();
    return activeKeys.has(upperKey) || activeKeys.has(key);
  };

  // Always render the toggle button container
  return (
    <div className={`keyboard-wrapper ${isVisible ? 'expanded' : ''}`}>
      {isVisible && (
        <div className="keyboard-container">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="keyboard-row"
              style={{ marginLeft: `${row.offset * 2.75}rem` }}
            >
              {row.keys.map((key) => (
                <div
                  key={key}
                  className={`keyboard-key ${isKeyActive(key) ? 'active' : ''}`}
                  style={{
                    '--key-color': getKeyColor(key),
                    '--key-active-color': getKeyColor(key),
                  }}
                >
                  {key}
                </div>
              ))}
            </div>
          ))}
          <div className="keyboard-row" style={{ marginLeft: `${1.25 * 2.75}rem` }}>
            <div
              className={`keyboard-key space-key ${activeKeys.has(' ') ? 'active' : ''}`}
              style={{
                '--key-color': SPACE_COLOR,
                '--key-active-color': SPACE_COLOR,
              }}
            >
              Space
            </div>
          </div>
        </div>
      )}

      {/* Toggle button - always visible at bottom right */}
      <button
        className={`keyboard-toggle-btn ${isVisible ? 'active' : ''}`}
        onClick={onToggle}
        title="Toggle Keyboard"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
          <path d="M6 8h.001" />
          <path d="M10 8h.001" />
          <path d="M14 8h.001" />
          <path d="M18 8h.001" />
          <path d="M8 12h.001" />
          <path d="M12 12h.001" />
          <path d="M16 12h.001" />
          <path d="M7 16h10" />
        </svg>
      </button>

      <style>{`
        .keyboard-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .keyboard-wrapper.expanded {
          align-items: stretch;
        }

        .keyboard-container {
          width: 100%;
          background: var(--color-bg);
          border-top: 1px solid var(--color-border);
          padding: 1rem;
          padding-bottom: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .keyboard-row {
          display: flex;
          gap: 0.25rem;
        }

        .keyboard-key {
          min-width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--key-color);
          border-radius: 4px;
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 500;
          color: #333;
          opacity: 0.6;
          transition: all 0.1s ease;
          user-select: none;
        }

        .keyboard-key.active {
          opacity: 1;
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .space-key {
          min-width: 15rem;
        }

        .keyboard-toggle-btn {
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px 8px 0 0;
          border-bottom: none;
          color: var(--color-icon);
          width: 44px;
          height: 36px;
          cursor: pointer;
          padding: 0;
          margin-right: 1rem;
          margin-bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s, background 0.3s;
          box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.05);
        }

        .keyboard-wrapper.expanded .keyboard-toggle-btn {
          position: absolute;
          right: 0;
          bottom: 100%;
          margin-right: 1rem;
          margin-bottom: 0;
        }

        .keyboard-toggle-btn:hover {
          color: var(--color-text);
          background: var(--color-bg-hover);
        }

        .keyboard-toggle-btn.active {
          color: var(--color-accent);
        }

        @media (max-width: 768px) {
          .keyboard-key {
            min-width: 1.8rem;
            height: 2rem;
            font-size: 0.7rem;
          }
          .space-key {
            min-width: 10rem;
          }
          .keyboard-container {
            padding: 0.5rem;
            padding-bottom: 0.25rem;
            gap: 0.25rem;
          }
          .keyboard-row {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Keyboard;
