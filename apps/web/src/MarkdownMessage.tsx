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
    if (isBareUrl && href) {
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

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
