import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@odh/ui";
import type { PortfolioItem } from "@/content/portfolio";

export function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {item.image ? (
        <Image
          src={item.image}
          alt={`ผลงาน ${item.title}`}
          width={514}
          height={400}
          className="aspect-[514/400] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[514/400] w-full items-center justify-center bg-gradient-to-br from-navy to-navy-deep p-6 text-center">
          <span className="font-display text-2xl font-bold text-paper">{item.client}</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={item.status === "live" ? "gold" : "soft"}>{item.category}</Badge>
          {item.status === "closed" ? (
            <span className="text-xs text-muted">ปิดให้บริการแล้ว</span>
          ) : null}
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-navy">{item.title}</h3>
        <p className="mt-1 text-sm font-medium text-navy/70">{item.client}</p>
        <p className="mt-2 flex-1 text-sm text-muted">{item.result}</p>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-display text-sm font-semibold text-gold hover:underline"
          >
            {item.linkLabel ?? "ดูระบบจริง"} <ArrowUpRight size={16} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
