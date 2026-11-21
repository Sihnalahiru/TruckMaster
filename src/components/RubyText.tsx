import { Fragment } from 'react';

interface RubyTextProps {
  markup: string;
  showFurigana?: boolean;
  className?: string;
}

/**
 * Parses `漢字[かんじ]` ruby markup extracted from the official Japanese PDF
 * into semantic HTML `<ruby>漢字<rt>かんじ</rt></ruby>`.
 */
export function RubyText({ markup, showFurigana = true, className = '' }: RubyTextProps) {
  const parts: Array<{ text: string; rt?: string }> = [];
  const regex = /([^\[\]\s]+?)\[([^\[\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markup)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: markup.slice(lastIndex, match.index) });
    }
    parts.push({ text: match[1], rt: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < markup.length) {
    parts.push({ text: markup.slice(lastIndex) });
  }

  return (
    <span className={`font-jp ${className}`}>
      {parts.map((part, idx) =>
        part.rt && showFurigana ? (
          <ruby key={idx}>
            {part.text}
            <rt>{part.rt}</rt>
          </ruby>
        ) : (
          <Fragment key={idx}>{part.text}</Fragment>
        ),
      )}
    </span>
  );
}
