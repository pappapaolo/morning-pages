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

  const handleKeyDown = (e) => {
    if (e.key === ' ') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      // Check if we are in a text node
      if (startNode.nodeType === Node.TEXT_NODE) {
        const textBefore = startNode.textContent.slice(0, range.startOffset);

        // Check for "- " or "* " pattern at the start of the line/paragraph
        // We look for the last newline or beginning of string
        const lastNewLine = textBefore.lastIndexOf('\n');
        const textAfterLines = lastNewLine === -1 ? textBefore : textBefore.slice(lastNewLine + 1);

        if (textAfterLines === '-' || textAfterLines === '*') {
          e.preventDefault();

          // Select the asterisk/dash
          const newRange = document.createRange();
          newRange.setStart(startNode, lastNewLine + 1 === 0 ? 0 : lastNewLine + 1 + (textBefore.length - (lastNewLine + 1) - 1)); // math to find char start
          // Actually simpler: we know we are at offset. characters are at offset-1.

          // Let's rely on string replacement in the node for simplicity and safety
          // Remove the char (dash/star) and insert bullet

          // Using execCommand to preserve history stack if possible, but it's deprecated.
          // Fallback to manual manipulation (no undo support for this specific auto-format without custom stack).
          // But execCommand 'insertText' is usually supported.

          // Delete Key equivalent?
          // Let's just manipulate textContent to be safe
          const textNode = startNode;
          const currentText = textNode.textContent;
          const splitPoint = range.startOffset;

          // Replace "curr - 1" with bullet?
          // The pattern is "char" then user pressed "Space".
          // So currently text is just "char". Space is being handled.

          // Modify: "char" -> "• " (bullet + extra space? No, just bullet, then the typed space adds itself? 
          // Wait, e.preventDefault() stops the space. So we must insert "• " manually.

          const before = currentText.slice(0, splitPoint - 1); // remove dash
          const after = currentText.slice(splitPoint);

          textNode.textContent = before + '• \u00A0' + after; // bullet + nbsp

          // Restore cursor
          const newCursorPos = before.length + 3; // bullet + space + nbsp length? 
          // "• \u00A0" is 3 chars? No "\u00A0" is 1 char. "•" is 1. Space is 1. "• \u00A0" is 3. 
          // Let's just use "• " (normal space)
          textNode.textContent = before + '• ' + after;

          newRange.setStart(textNode, before.length + 2);
          newRange.setEnd(textNode, before.length + 2);
          selection.removeAllRanges();
          selection.addRange(newRange);

          // Update state
          if (onChange && contentRef.current) onChange(contentRef.current.innerText);
        }
      }
    }

    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      if (startNode.nodeType === Node.TEXT_NODE) {
        const textBefore = startNode.textContent.slice(0, range.startOffset);
        const lastNewLine = textBefore.lastIndexOf('\n');
        const currentLine = lastNewLine === -1 ? textBefore : textBefore.slice(lastNewLine + 1);

        if (currentLine.trim().startsWith('•')) {
          e.preventDefault();

          // If line is empty (just bullet), end list
          if (currentLine.trim() === '•') {
            // Remove the bullet
            const textNode = startNode;
            const allText = textNode.textContent;
            // Find the bullet and remove it.
            // This is tricky with raw text nodes.
            // let's just insert a newline and move on?
            document.execCommand('insertText', false, '\n');
            return;
          }

          // Insert newline and bullet
          document.execCommand('insertText', false, '\n• ');
        }
      }
    }
  };

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
        onKeyDown={handleKeyDown}
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
          line-height: 1.6; 
          color: var(--color-text);
          min-height: 50vh;
          white-space: pre-wrap;
          position: relative;
          z-index: 10; 
        }
        
        /* Style paragraphs - Reduced spacing */
        .editor-content > div, .editor-content > p {
            margin-top: 0.5em; 
            margin-bottom: 0.5em;
            min-height: 1em; 
        }
      `}</style>
    </div>
  );
};

export default Editor;
