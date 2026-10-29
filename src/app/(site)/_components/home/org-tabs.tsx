"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface OrgTab {
  value: string;
  label: string;
  count: number;
  content: ReactNode;
}

/** Switches between the movement's departments, feeder organisations and publications. Panels are rendered on the server. */
export function OrgTabs({ tabs }: { tabs: OrgTab[] }) {
  return (
    <Tabs defaultValue={tabs[0]?.value} className="mt-10 gap-8 lg:mt-14">
      <TabsList className="h-auto w-full flex-wrap justify-start self-start gap-2 rounded-2xl bg-white p-1.5 shadow-soft sm:w-auto">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="min-h-11 flex-none gap-2 rounded-xl px-4 text-sm font-semibold text-ink-soft transition-all duration-300 hover:text-navy data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_-8px_rgb(7_30_127/0.6)]"
          >
            {t.label}
            <span className="rounded-full bg-current/10 px-2 py-0.5 text-xs tabular-nums">{t.count}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2 data-[state=active]:duration-500">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
