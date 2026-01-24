import React, { useState, useEffect } from 'react';

const KEYBOARD_ROWS = [
  { keys: ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='], color: '#ff6b6b' },
  { keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'], color: '#ffa94d' },
  { keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"], color: '#ffd43b' },
  { keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'], color: '#69db7c' },
];

const SPACE_COLOR = '#74c0fc';

const Keyboard = ({ isVisible }) => {
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

  if (!isVisible) return null;

  const isKeyActive = (key) => {
    const upperKey = key.toUpperCase();
    return activeKeys.has(upperKey) || activeKeys.has(key);
  };

  return (
    <div className="keyboard-container">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard-row">
          {row.keys.map((key) => (
            <div
              key={key}
              className={`keyboard-key ${isKeyActive(key) ? 'active' : ''}`}
              style={{
                '--key-color': row.color,
                '--key-active-color': row.color,
              }}
            >
              {key}
            </div>
          ))}
        </div>
      ))}
      <div className="keyboard-row">
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

      <style>{`
        .keyboard-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--color-bg);
          border-top: 1px solid var(--color-border);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          z-index: 100;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }

        .keyboard-row {
          display: flex;
          gap: 0.25rem;
          justify-content: center;
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
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Keyboard;
