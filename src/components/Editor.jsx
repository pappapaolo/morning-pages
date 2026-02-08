import React, { useEffect, useRef, useState } from 'react';
import FlameIcon from './FlameIcon';

const BULLET_LINE_RE = /^(\s*)(?:[-*+•])\s(.*)$/;
const ORDERED_LINE_RE = /^(\s*)(\d+)([.)])\s(.*)$/;

const Editor = ({ value, onChange, programProgress, totalDays = 1, isYesterday = false }) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Grow with content to keep writing flow in the page scroll.
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    const minHeightPx = window.innerHeight * 0.5;
    textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, minHeightPx)}px`;
  }, [value]);

  const setCursorPosition = (position) => {
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.selectionStart = position;
      textareaRef.current.selectionEnd = position;
    });
  };

  const replaceRange = (text, start, end, replacement) => {
    return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
  };

  const getLineBounds = (text, cursor) => {
    const lineStart = text.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const nextBreak = text.indexOf('\n', cursor);
    const lineEnd = nextBreak === -1 ? text.length : nextBreak;
    return {
      lineStart,
      lineEnd,
      line: text.slice(lineStart, lineEnd),
    };
  };

  const handleEditorChange = (e) => {
    if (onChange) onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (!textareaRef.current || !onChange) return;

    const selectionStart = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;

    if (selectionStart !== selectionEnd) return;

    const { lineStart, lineEnd, line } = getLineBounds(value, selectionStart);

    if (e.key === ' ') {
      const beforeCursor = value.slice(lineStart, selectionStart);
      const bulletShortcut = beforeCursor.match(/^(\s*)[-*+]$/);
      if (!bulletShortcut) return;

      e.preventDefault();
      const indent = bulletShortcut[1];
      const replacement = `${indent}• `;
      const updated = replaceRange(value, lineStart, selectionStart, replacement);
      onChange(updated);
      setCursorPosition(lineStart + replacement.length);
      return;
    }

    if (e.key !== 'Enter') return;

    const bulletMatch = line.match(BULLET_LINE_RE);
    if (bulletMatch) {
      e.preventDefault();
      const indent = bulletMatch[1];
      const body = bulletMatch[2];

      if (body.trim() === '') {
        const updated = replaceRange(value, lineStart, lineEnd, '');
        onChange(updated);
        setCursorPosition(lineStart);
        return;
      }

      const insertion = `\n${indent}• `;
      const updated = replaceRange(value, selectionStart, selectionEnd, insertion);
      onChange(updated);
      setCursorPosition(selectionStart + insertion.length);
      return;
    }

    const orderedMatch = line.match(ORDERED_LINE_RE);
    if (!orderedMatch) return;

    e.preventDefault();
    const indent = orderedMatch[1];
    const number = Number(orderedMatch[2]);
    const delimiter = orderedMatch[3];
    const body = orderedMatch[4];

    if (body.trim() === '') {
      const updated = replaceRange(value, lineStart, lineEnd, '');
      onChange(updated);
      setCursorPosition(lineStart);
      return;
    }

    const nextPrefix = `${indent}${number + 1}${delimiter} `;
    const insertion = `\n${nextPrefix}`;
    const updated = replaceRange(value, selectionStart, selectionEnd, insertion);
    onChange(updated);
    setCursorPosition(selectionStart + insertion.length);
  };

  const showPlaceholder = !value || value.trim() === '';
  const isFirstDay = programProgress.week === 1 && programProgress.day === 1;

  return (
    <div className="editor-container" onClick={() => textareaRef.current?.focus()}>
      {showPlaceholder && (
        <div className={`placeholder-overlay ${isFocused ? 'dimmed' : ''} ${!isFirstDay ? 'minimal' : ''}`}>
          {isFirstDay ? (
            <>
              <p>
                <strong>Morning Pages</strong> are three pages of longhand, stream of consciousness writing, done first thing in the morning.*
              </p>
              <p>
                There is no wrong way to do Morning Pages. These daily pages are not meant to be art. They are not even meant to be "writing." They are about anything and everything that crosses your mind - and they are for your eyes only.
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

      <textarea
        ref={textareaRef}
        className="editor-content"
        value={value}
        onChange={handleEditorChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        spellCheck={false}
        aria-label="Morning pages editor"
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
          pointer-events: none;
          color: var(--color-dim);
          transition: opacity 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          font-family: var(--font-body);
          font-size: 1.15rem;
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
          color: var(--color-text);
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

        .placeholder-overlay.minimal {
          justify-content: center;
          align-items: center;
          text-align: center;
          padding-bottom: 10vh;
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
          border: none;
          padding: 0;
          margin: 0;
          resize: none;
          overflow: hidden;
          background: transparent;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.6;
          color: var(--color-text);
          min-height: 50vh;
          white-space: pre-wrap;
          word-break: break-word;
          position: relative;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};

export default Editor;
