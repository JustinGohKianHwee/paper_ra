import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { normaliseMarkdownMath } from "@/lib/markdown/math";
import { cn } from "@/lib/utils";

/**
 * Canonical Markdown renderer: GitHub-flavoured Markdown, KaTeX maths
 * ($…$ / $$…$$), and code highlighting. Server-component friendly.
 */
export function MarkdownView({
  markdown,
  className,
  assumeDisplayMath = false,
}: {
  markdown: string;
  className?: string;
  assumeDisplayMath?: boolean;
}) {
  if (!markdown.trim()) return null;
  const normalisedMarkdown = normaliseMarkdownMath(markdown, { assumeDisplayMath });
  return (
    <div className={cn("prose-notes", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
      >
        {normalisedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
