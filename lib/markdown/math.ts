export function normaliseMarkdownMath(
  markdown: string,
  options: { assumeDisplayMath?: boolean } = {}
): string {
  let value = markdown
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body: string) => `$$\n${body.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    .replace(
      /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\1\}/g,
      (_, env: string, body: string) => {
        const inner = body.trim();
        if (env.startsWith("align")) return `$$\n\\begin{aligned}\n${inner}\n\\end{aligned}\n$$`;
        if (env.startsWith("gather")) return `$$\n\\begin{gathered}\n${inner}\n\\end{gathered}\n$$`;
        return `$$\n${inner}\n$$`;
      }
    );

  if (options.assumeDisplayMath && shouldWrapAsDisplayMath(value)) {
    value = `$$\n${value.trim()}\n$$`;
  }

  return value;
}

function shouldWrapAsDisplayMath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/[`#]|^\s*[-*+]\s/m.test(trimmed)) return false;
  if (/(^|\n)\s*\$\$|(^|[^\\])\$/.test(trimmed)) return false;
  if (trimmed.includes("\n\n")) return false;
  return /\\[A-Za-z]+|\\[{}]|[_^]=?|[=<>]\s*|\\,|\\\\/.test(trimmed);
}
