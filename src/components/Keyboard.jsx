import React, { useState, useEffect } from 'react';

// Realistic keyboard layout with proper key widths and stagger offsets
const KEYBOARD_ROWS = [
  {
    keys: [
      { key: '`', width: 1 }, { key: '1', width: 1 }, { key: '2', width: 1 },
      { key: '3', width: 1 }, { key: '4', width: 1 }, { key: '5', width: 1 },
      { key: '6', width: 1 }, { key: '7', width: 1 }, { key: '8', width: 1 },
      { key: '9', width: 1 }, { key: '0', width: 1 }, { key: '-', width: 1 },
      { key: '=', width: 1 }, { key: 'Backspace', width: 2, label: '\u232B' }
    ],
    offset: 0 // Number row - no offset
  },
  {
    keys: [
      { key: 'Tab', width: 1.5, label: '\u21E5' },
      { key: 'Q', width: 1 }, { key: 'W', width: 1 }, { key: 'E', width: 1 },
      { key: 'R', width: 1 }, { key: 'T', width: 1 }, { key: 'Y', width: 1 },
      { key: 'U', width: 1 }, { key: 'I', width: 1 }, { key: 'O', width: 1 },
      { key: 'P', width: 1 }, { key: '[', width: 1 }, { key: ']', width: 1 },
      { key: '\\', width: 1.5 }
    ],
    offset: 0.5 // QWERTY row - 0.5 key offset
  },
  {
    keys: [
      { key: 'CapsLock', width: 1.75, label: '\u21EA' },
      { key: 'A', width: 1 }, { key: 'S', width: 1 }, { key: 'D', width: 1 },
      { key: 'F', width: 1 }, { key: 'G', width: 1 }, { key: 'H', width: 1 },
      { key: 'J', width: 1 }, { key: 'K', width: 1 }, { key: 'L', width: 1 },
      { key: ';', width: 1 }, { key: "'", width: 1 },
      { key: 'Enter', width: 2.25, label: '\u21B5' }
    ],
    offset: 0.75 // ASDF row - 0.75 key offset
  },
  {
    keys: [
      { key: 'Shift', width: 2.25, label: '\u21E7' },
      { key: 'Z', width: 1 }, { key: 'X', width: 1 }, { key: 'C', width: 1 },
      { key: 'V', width: 1 }, { key: 'B', width: 1 }, { key: 'N', width: 1 },
      { key: 'M', width: 1 }, { key: ',', width: 1 }, { key: '.', width: 1 },
      { key: '/', width: 1 },
      { key: 'ShiftRight', width: 2.75, label: '\u21E7' }
    ],
    offset: 1.25 // ZXCV row - 1.25 key offset
  },
];

// Touch typing column colors (finger-based, symmetric between hands)
const getKeyColor = (key) => {
  const upperKey = key.toUpperCase();

  // Modifier keys (neutral gray)
  if (['TAB', 'CAPSLOCK', 'SHIFT', 'SHIFTRIGHT', 'ENTER', 'BACKSPACE'].includes(upperKey)) {
    return '#adb5bd';
  }

  // Left pinky (red): ` 1 Q A Z
  if (['`', '1', 'Q', 'A', 'Z'].includes(upperKey)) return '#ff6b6b';

  // Left ring (orange): 2 W S X
  if (['2', 'W', 'S', 'X'].includes(upperKey)) return '#ffa94d';

  // Left middle (yellow): 3 E D C
  if (['3', 'E', 'D', 'C'].includes(upperKey)) return '#ffd43b';

  // Left index (green): 4 5 R T F G V B
  if (['4', '5', 'R', 'T', 'F', 'G', 'V', 'B'].includes(upperKey)) return '#69db7c';

  // Right index (green): 6 7 Y U H J N M
  if (['6', '7', 'Y', 'U', 'H', 'J', 'N', 'M'].includes(upperKey)) return '#69db7c';

  // Right middle (yellow): 8 I K ,
  if (['8', 'I', 'K', ','].includes(upperKey)) return '#ffd43b';

  // Right ring (orange): 9 O L .
  if (['9', 'O', 'L', '.'].includes(upperKey)) return '#ffa94d';

  // Right pinky (red): 0 P ; / - = [ ] \ '
  if (['0', 'P', ';', '/', '-', '=', '[', ']', '\\', "'"].includes(upperKey)) return '#ff6b6b';

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

  const isKeyActive = (keyObj) => {
    const key = typeof keyObj === 'string' ? keyObj : keyObj.key;
    const upperKey = key.toUpperCase();
    // Handle special cases for modifier keys
    if (upperKey === 'SHIFTRIGHT') return activeKeys.has('SHIFT');
    return activeKeys.has(upperKey) || activeKeys.has(key);
  };

  // Base key size in rem (20% smaller: 2rem instead of 2.5rem)
  const BASE_KEY_SIZE = 2;
  const KEY_GAP = 0.2;

  // Always render the toggle button container
  return (
    <div className={`keyboard-wrapper ${isVisible ? 'expanded' : ''}`}>
      {isVisible && (
        <div className="keyboard-container">
          {KEYBOARD_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="keyboard-row"
              style={{ marginLeft: `${row.offset * BASE_KEY_SIZE}rem` }}
            >
              {row.keys.map((keyObj) => (
                <div
                  key={keyObj.key}
                  className={`keyboard-key ${isKeyActive(keyObj) ? 'active' : ''}`}
                  style={{
                    '--key-color': getKeyColor(keyObj.key),
                    '--key-active-color': getKeyColor(keyObj.key),
                    width: `${keyObj.width * BASE_KEY_SIZE + (keyObj.width - 1) * KEY_GAP}rem`,
                  }}
                >
                  {keyObj.label || keyObj.key}
                </div>
              ))}
            </div>
          ))}
          <div className="keyboard-row space-row">
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
          padding: 0.75rem;
          padding-bottom: 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2rem;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .keyboard-row {
          display: flex;
          gap: 0.2rem;
          justify-content: center;
        }

        .space-row {
          margin-top: 0.2rem;
        }

        .keyboard-key {
          min-width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--key-color);
          border-radius: 4px;
          font-family: var(--font-sans);
          font-size: 0.7rem;
          font-weight: 500;
          color: #333;
          opacity: 0.6;
          transition: all 0.1s ease;
          user-select: none;
        }

        .keyboard-key.active {
          opacity: 1;
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .space-key {
          min-width: 12rem;
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
            min-width: 1.5rem;
            height: 1.5rem;
            font-size: 0.55rem;
          }
          .space-key {
            min-width: 8rem;
          }
          .keyboard-container {
            padding: 0.5rem;
            padding-bottom: 0.25rem;
            gap: 0.15rem;
          }
          .keyboard-row {
            gap: 0.15rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Keyboard;
