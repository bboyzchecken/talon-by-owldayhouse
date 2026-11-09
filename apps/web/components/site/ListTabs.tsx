"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ListTab {
  id: string;
  label: string;
  items: readonly { category: string; title: string; href: string; external?: boolean }[];
}

/** Hairline list of work and articles, with tabs when there is more than one group. */
export function ListTabs({ tabs }: { tabs: readonly ListTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div>
      {tabs.length > 1 ? (
        <div className="odh-tabs" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={tab.id === current.id} onClick={() => setActive(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="odh-news" role={tabs.length > 1 ? "tabpanel" : undefined}>
        {current.items.map((item) => {
          const body = (
            <>
              <span className="odh-mono">{item.category}</span>
              <h3>{item.title}</h3>
              <ArrowRight size={18} />
            </>
          );
          return item.external ? (
            <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer">
              {body}
            </a>
          ) : (
            <Link key={item.title} href={item.href}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
