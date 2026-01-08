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
          <p>
            <strong>Morning Pages</strong> are three pages of longhand, stream of consciousness writing, done first thing in the morning.*
          </p>
          <p>
            There is no wrong way to do Morning Pages. These daily pages are not meant to be art. They are not even meant to be "writing." They are about anything and everything that crosses your mind – and they are for your eyes only.
          </p>
          <p className="footnote">
            *For this digital version, "three pages" equals 750 words.
          </p>
          <div className="progress-info">
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
            color: var(--color-dim);
            transition: opacity 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* Left align */
            text-align: left;
            font-family: var(--font-body);
            font-size: 1.15rem; /* Match editor font size */
            line-height: 1.8;
        }
        .placeholder-overlay.dimmed {
            opacity: 0.1;
        }
        .placeholder-overlay p {
            margin: 0 0 1.5rem 0;
            max-width: 680px;
        }
        .placeholder-overlay strong {
            font-weight: bold;
            color: var(--color-text); /* Slight emphasis on title */
        }
        .footnote {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-bottom: 2rem !important;
            font-style: italic;
        }
        .progress-info {
            font-family: var(--font-sans);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.6;
            margin-top: 1rem;
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
