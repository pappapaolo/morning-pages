import React, { useEffect, useRef, useState } from 'react';

const Editor = ({ value, onChange, programProgress }) => {
  const contentRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync value from props only if drastically different from current innerText to avoid cursor jumping
  // For a simple implementation, we can trust local state for typing and only sync on load
  useEffect(() => {
    if (contentRef.current && value) {
      const currentText = contentRef.current.innerText;
      // Only update if empty or significantly different (e.g. initial load)
      if (currentText.trim() === '' && value.length > 0) {
        contentRef.current.innerText = value;
      }
    }
  }, [value]);

  const handleInput = (e) => {
    if (onChange) {
      onChange(e.currentTarget.innerText);
    }
  };

  const showPlaceholder = !value || value.trim() === '';

  return (
    <div className="editor-container">

      {showPlaceholder && (
        <div className={`placeholder-overlay ${isFocused ? 'dimmed' : ''}`}>
          <h2>Morning Pages</h2>
          <p className="subtitle">Write three pages of stream-of-consciousness writing.</p>
          <div className="progress-pill">
            Week {programProgress?.week || 1} of 12 • Day {programProgress?.day || 1}
          </div>
        </div>
      )}

      <div
        ref={contentRef}
        className="editor-content"
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        suppressContentEditableWarning={true}
      />

      <style>{`
        .editor-container {
          width: 100%;
          margin-top: 1rem;
          cursor: text;
          position: relative;
        }
        .placeholder-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none; /* Let clicks pass through to editor */
            padding-top: 2rem;
            color: var(--color-dim);
            transition: opacity 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .placeholder-overlay.dimmed {
            opacity: 0.15;
        }
        .placeholder-overlay h2 {
            font-size: 1.8rem;
            color: var(--color-dim);
            margin-bottom: 0.5rem;
            font-weight: normal;
        }
        .placeholder-overlay .subtitle {
            font-size: 1rem;
            opacity: 0.8;
            margin-bottom: 2rem;
            font-style: italic;
        }
        .progress-pill {
            background: var(--color-bg-active);
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-family: var(--font-sans); /* Use sans for data */
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.8;
        }

        .editor-content {
          width: 100%;
          outline: none;
          background: transparent;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.8; 
          color: var(--color-text);
          min-height: 50vh;
          white-space: pre-wrap;
          position: relative;
          z-index: 10; 
        }
        
        /* Style paragraphs */
        .editor-content > div, .editor-content > p {
            margin-top: 2em; 
            margin-bottom: 2em;
            min-height: 1.6em; 
        }
      `}</style>
    </div>
  );
};

export default Editor;
