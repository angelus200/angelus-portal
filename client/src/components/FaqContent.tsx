// Gemeinsamer FAQ-Renderer (Investor-Gate + Admin-Vorschau). react-markdown + rehype-sanitize:
// sanitized by default, KEIN dangerouslySetInnerHTML. Quelle ist IMMER faq.content (aus faq_versions),
// nie die Datei -> der angezeigte Text ist exakt der gehashte Volltext. Leichte Element-Styles ohne
// @tailwindcss/typography-Abhängigkeit (semantisches HTML aus dem Markdown).
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export function FaqContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-3">
      <Markdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold mt-5 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold border-b pb-1 mt-5 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="font-semibold mt-3">{children}</h3>,
          p: ({ children }) => <p className="my-1.5">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
          blockquote: ({ children }) => <blockquote className="border-l-2 pl-3 text-muted-foreground my-2">{children}</blockquote>,
          hr: () => <hr className="my-4 border-t" />,
          a: ({ children, href }) => <a href={href} className="underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
