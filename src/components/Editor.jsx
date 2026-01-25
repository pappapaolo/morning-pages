import React, { useEffect, useRef, useState } from 'react';
import FlameIcon from './FlameIcon';

const Editor = ({ value, onChange, programProgress, totalDays = 1, isYesterday = false }) => {
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
      // Extract text content, preserving the semantic structure
      onChange(e.currentTarget.innerText);
    }
  };

  // Helper to create a bullet line span
  const createBulletSpan = (text) => {
    const span = document.createElement('span');
    span.className = 'bullet-line';
    span.textContent = text;
    return span;
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

          const textNode = startNode;
          const currentText = textNode.textContent;
          const splitPoint = range.startOffset;

          // Get text before the dash (previous lines) and after cursor
          const before = currentText.slice(0, splitPoint - 1); // remove dash
          const after = currentText.slice(splitPoint);

          // Create the bullet span
          const bulletSpan = createBulletSpan('•  ');

          // If there's text before, keep it as a text node
          if (before) {
            textNode.textContent = before;
            // Insert span after the text node
            textNode.parentNode.insertBefore(bulletSpan, textNode.nextSibling);
          } else {
            // Replace the text node with the span
            textNode.parentNode.replaceChild(bulletSpan, textNode);
          }

          // If there's text after, append it to the span
          if (after) {
            const afterNode = document.createTextNode(after);
            bulletSpan.parentNode.insertBefore(afterNode, bulletSpan.nextSibling);
          }

          // Position cursor inside the span after "•  "
          const newRange = document.createRange();
          newRange.setStart(bulletSpan.firstChild, 3); // After "•  "
          newRange.setEnd(bulletSpan.firstChild, 3);
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

      // Check if we're inside a bullet-line span
      const bulletSpan = startNode.nodeType === Node.TEXT_NODE
        ? startNode.parentElement?.closest('.bullet-line')
        : startNode.closest?.('.bullet-line');

      if (bulletSpan) {
        e.preventDefault();

        const textContent = bulletSpan.textContent;
        // Check if it's just bullet with spaces (empty bullet line)
        if (textContent.replace(/[•\s]/g, '') === '') {
          // End the list - remove the bullet span and insert a line break
          const br = document.createElement('br');
          bulletSpan.parentNode.replaceChild(br, bulletSpan);

          // Position cursor after the br
          const newRange = document.createRange();
          newRange.setStartAfter(br);
          newRange.setEndAfter(br);
          selection.removeAllRanges();
          selection.addRange(newRange);

          if (onChange && contentRef.current) onChange(contentRef.current.innerText);
          return;
        }

        // Create a new bullet span for the next line
        const newBulletSpan = createBulletSpan('•  ');

        // Insert line break and new span after current span
        const br = document.createElement('br');
        bulletSpan.parentNode.insertBefore(br, bulletSpan.nextSibling);
        bulletSpan.parentNode.insertBefore(newBulletSpan, br.nextSibling);

        // Position cursor in the new span
        const newRange = document.createRange();
        newRange.setStart(newBulletSpan.firstChild, 3);
        newRange.setEnd(newBulletSpan.firstChild, 3);
        selection.removeAllRanges();
        selection.addRange(newRange);

        if (onChange && contentRef.current) onChange(contentRef.current.innerText);
        return;
      }

      // Fallback: check for bullet in plain text (legacy support)
      if (startNode.nodeType === Node.TEXT_NODE) {
        const textBefore = startNode.textContent.slice(0, range.startOffset);
        const lastNewLine = textBefore.lastIndexOf('\n');
        const currentLine = lastNewLine === -1 ? textBefore : textBefore.slice(lastNewLine + 1);

        if (currentLine.trim().startsWith('•')) {
          e.preventDefault();

          // If line is empty (just bullet), end list
          if (currentLine.trim() === '•') {
            document.execCommand('insertText', false, '\n');
            return;
          }

          // Insert newline and bullet
          document.execCommand('insertText', false, '\n•  ');
        }
      }
    }
  };

  const isFirstDay = programProgress.week === 1 && programProgress.day === 1;

  return (
    <div className="editor-container">

      {showPlaceholder && (
        <div className={`placeholder-overlay ${isFocused ? 'dimmed' : ''} ${!isFirstDay ? 'minimal' : ''}`}>
          {isFirstDay ? (
            <>
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
            </>
          ) : (
            <div className="minimal-placeholder">
              <div className="streak-flame-container">
                <FlameIcon size="large" isGrey={isYesterday} />
                <div className="streak-number">{isYesterday ? 'Yesterday' : `Day ${totalDays}`}</div>
              </div>
            </div>
          )}
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

        /* Minimal Mode Styles */
        .placeholder-overlay.minimal {
            justify-content: center;
            align-items: center;
            text-align: center;
            padding-bottom: 10vh; /* Visual balance */
        }
        
        .minimal-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            animation: fadeIn 0.8s ease-out;
        }

        .streak-flame-container {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }

        .streak-number {
            font-size: 3rem;
            font-weight: 300;
            font-family: var(--font-body);
            color: var(--color-dim);
            line-height: 1;
            letter-spacing: -1px;
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

        /* Bullet line with hanging indent for proper text wrapping */
        .bullet-line {
          display: block;
          padding-left: 1.5em;
          text-indent: -1.5em;
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
