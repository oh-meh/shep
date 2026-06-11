import type { ReactNode } from "react";

const MD_TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

/** Render the small subset of inline markdown that shows up in to-do items —
 *  `**bold**`, `` `code` ``, and `[text](url)` links (shown as styled text,
 *  not navigable, with the URL in the tooltip). Everything else is literal. */
export function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(MD_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      const close = token.indexOf("](");
      nodes.push(
        <span key={key++} className="md-inline-link" title={token.slice(close + 2, -1)}>
          {token.slice(1, close)}
        </span>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
