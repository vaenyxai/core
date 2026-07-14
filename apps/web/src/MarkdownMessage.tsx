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

const components: Components = {
  a({ href, children }) {
    if (!isSafeHref(href)) {
      return <>{children}</>;
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
