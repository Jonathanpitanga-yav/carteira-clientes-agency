import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"

const components: Components = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30">{children}</tr>,
  th: ({ children }) => <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground first:pl-2 last:text-right last:pr-2">{children}</th>,
  td: ({ children }) => <td className="py-1.5 pr-3 text-left last:text-right last:pr-2 tabular-nums">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">{children}</code>,
  ul: ({ children }) => <ul className="my-1 space-y-0.5 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 space-y-0.5 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  p: ({ children }) => <p className="text-sm leading-relaxed my-1 last:mb-0">{children}</p>,
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1">{children}</h3>,
}

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
