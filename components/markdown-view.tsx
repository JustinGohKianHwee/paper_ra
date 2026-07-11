import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/**
 * Canonical Markdown renderer: GitHub-flavoured Markdown, KaTeX maths
 * ($…$ / $$…$$), and code highlighting. Server-component friendly.
 */
export function MarkdownView({ markdown, className }: { markdown: string; className?: string }) {
  if (!markdown.trim()) return null;
  return (
    <div className={cn("prose-notes", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
