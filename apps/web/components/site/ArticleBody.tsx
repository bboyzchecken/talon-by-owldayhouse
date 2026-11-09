import type { ReactNode } from "react";
import Link from "next/link";

// Renders the small Markdown subset used in content/articles.ts at build time.

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={index}>{bold[1]}</strong>;
    const link = part.match(/^\[(.+)\]\((.+)\)$/);
    if (link) {
      const [, label = "", href = ""] = link;
      return href.startsWith("http") ? (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link key={index} href={href}>
          {label}
        </Link>
      );
    }
    return part;
  });
}

export function ArticleBody({ source }: { source: string }) {
  return (
    <>
      {source.split(/\n{2,}/).map((block, index) => {
        const text = block.trim();
        if (text.startsWith("### ")) return <h3 key={index}>{inline(text.slice(4))}</h3>;
        if (text.startsWith("## ")) return <h2 key={index}>{inline(text.slice(3))}</h2>;
        if (text.startsWith("> ")) return <blockquote key={index}>{inline(text.slice(2))}</blockquote>;
        const lines = text.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {lines.map((line) => (
                <li key={line}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((line) => /^\d+\. /.test(line))) {
          return (
            <ol key={index}>
              {lines.map((line) => (
                <li key={line}>{inline(line.replace(/^\d+\. /, ""))}</li>
              ))}
            </ol>
          );
        }
        return <p key={index}>{inline(text)}</p>;
      })}
    </>
  );
}
