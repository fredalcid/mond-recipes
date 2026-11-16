import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders article Markdown. Raw HTML in the text is never rendered (react-markdown's
 * default), so content can't inject scripts. External links open safely.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children: c }) => {
            const external = /^https?:\/\//.test(href);
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {c}
              </a>
            );
          },
          img: () => null, // images go through the media library, not inline links
          table: ({ children: c }) => (
            <div className="overflow-x-auto">
              <table>{c}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Splits Markdown roughly in half at a paragraph boundary (for a mid-article ad slot). */
export function splitMarkdown(body: string): [string, string] {
  const blocks = body.split(/\n{2,}/);
  if (blocks.length < 6) return [body, ""];
  let cut = Math.floor(blocks.length / 2);
  // Prefer to break just before a heading.
  for (let i = cut; i < blocks.length - 1; i++) if (/^#{2,3}\s/.test(blocks[i])) return [blocks.slice(0, i).join("\n\n"), blocks.slice(i).join("\n\n")];
  while (cut < blocks.length - 1 && /^(\||-|\d+\.)/.test(blocks[cut])) cut++;
  return [blocks.slice(0, cut).join("\n\n"), blocks.slice(cut).join("\n\n")];
}
