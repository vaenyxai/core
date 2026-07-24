import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// GitHub-flavored Markdown (tables, strikethrough, task lists, autolinks).
const remarkPlugins = [remarkGfm];

// react-markdown does NOT render raw HTML unless rehype-raw is added, so model
// output is escaped by default — no separate sanitizer needed. We still guard
// link hrefs against javascript:/data:/vbscript: and open links safely.
function isSafeHref(href: string | undefined): boolean {
  if (!href) {
    return false;
  }

  const value = href.trim().toLowerCase();

  return !(
    value.startsWith("javascript:") ||
    value.startsWith("data:") ||
    value.startsWith("vbscript:")
  );
}

// A bare pasted/autolinked URL renders as a small source pill showing just the
// domain (GPT-style citation chips) instead of a long raw address. Links with
// their own wording stay as normal text links.
function linkLabel(children: unknown): string {
  if (Array.isArray(children)) {
    return children.map((child) => linkLabel(child)).join("");
  }
  return typeof children === "string" ? children : "";
}

const components: Components = {
  a({ href, children }) {
    if (!isSafeHref(href)) {
      return <>{children}</>;
    }

    const label = linkLabel(children).trim();
    const isBareUrl =
      label === href ||
      label.startsWith("http://") ||
      label.startsWith("https://");
    // "[ft.com](https://…)"-style links read as citations too — same pill.
    const looksLikeDomain = /^[\w-]+(?:\.[\w-]+)+$/.test(label);
    if ((isBareUrl || looksLikeDomain) && href) {
      let domain = label;
      try {
        domain = new URL(href).hostname.replace(/^www\./, "");
      } catch {
        // Unparseable — keep the raw label.
      }
      return (
        <a
          className="source-pill"
          href={href}
          rel="noopener noreferrer nofollow"
          target="_blank"
          title={href}
        >
          {domain}
        </a>
      );
    }

    return (
      <a href={href} rel="noopener noreferrer nofollow" target="_blank">
        {children}
      </a>
    );
  },
};

// Models tend to put "来源:" / "Sources:" on one line and the link(s) on the
// following line(s) — bare URLs or [text](url) markdown links — which makes
// the source pills render on their own row. Fold link-only lines back onto a
// preceding line that ends with a colon, and merge consecutive link-only
// lines, so pills flow inline (Oskar, dev.161/163). List items ("- https://…")
// are untouched — a link-only line must START with the link.
const SOURCE_TOKEN = String.raw`(?:\[[^\]\n]*\]\(https?:[^)\n]*\)|https?:\/\/\S+)`;
// Separators between links: spaces, ASCII/full-width commas and semicolons,
// and the CJK enumeration comma — written as escapes so the full-width
// characters can never silently degrade to their ASCII lookalikes.
const SOURCE_SEP = "[ \\t,;\\u3001\\uFF0C\\uFF1B]";
const SOURCE_LINE = new RegExp(
  `^[ \\t]*${SOURCE_TOKEN}(?:${SOURCE_SEP}+${SOURCE_TOKEN})*${SOURCE_SEP}*$`,
);
// ASCII ":" or full-width colon (U+FF1A) ending the label line.
const COLON_LINE_END = new RegExp("[:\\uFF1A][ \\t]*$");

function inlineSourceLines(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    let line = lines[index] ?? "";
    const canAbsorb = COLON_LINE_END.test(line) || SOURCE_LINE.test(line);
    if (canAbsorb) {
      let cursor = index + 1;
      while (cursor < lines.length) {
        let next = cursor;
        while (next < lines.length && (lines[next] ?? "").trim() === "") {
          next += 1;
        }
        const candidate = next < lines.length ? lines[next] ?? "" : "";
        if (candidate && SOURCE_LINE.test(candidate)) {
          line = `${line.trimEnd()} ${candidate.trim()}`;
          cursor = next + 1;
        } else {
          break;
        }
      }
      index = cursor;
    } else {
      index += 1;
    }
    out.push(line);
  }
  return out.join("\n");
}

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {inlineSourceLines(content)}
      </Markdown>
    </div>
  );
}
