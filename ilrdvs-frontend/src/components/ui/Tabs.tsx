import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

export function Tabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const activeItem = items.find((i) => i.id === active);
  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 px-1 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              active === item.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-navy-800"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeItem?.content}</div>
    </div>
  );
}
