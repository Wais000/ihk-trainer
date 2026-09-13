"use client";

import { useId, useState } from "react";
import { useUiDictionary } from "@/components/i18n/ui-i18n-provider";
import { cn } from "@/lib/utils";
import { DEMO_TOPICS } from "@/lib/landing/demo-content";

export function TopicTabs() {
  const dict = useUiDictionary().landing;
  const [active, setActive] = useState(0);
  const baseId = useId();

  const activeTopic = DEMO_TOPICS[active];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={dict.topicsHeading} className="flex flex-wrap gap-2">
        {DEMO_TOPICS.map((topic, i) => (
          <button
            key={topic.title}
            id={`${baseId}-tab-${i}`}
            role="tab"
            aria-selected={active === i}
            aria-controls={`${baseId}-panel-${i}`}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-pill border px-3 py-1.5 text-sm font-medium transition-colors",
              active === i
                ? "border-primary bg-accent text-accent-foreground"
                : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {topic.title}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="rounded-lg border border-border bg-card p-5 shadow-sm"
      >
        <p className="text-sm text-muted-foreground">{activeTopic.blurb}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dict.topicsCoveredLabel}
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {activeTopic.items.map((item) => (
            <li key={item.label} className="text-sm" lang="de">
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
