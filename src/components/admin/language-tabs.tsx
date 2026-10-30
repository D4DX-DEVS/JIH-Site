"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LanguageTabsProps {
  defaultValue?: "ml" | "en";
  children: React.ReactNode;
}

const TRIGGER =
  "h-8 flex-1 rounded-md border-0 px-4 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-[var(--admin-navy)] data-[state=active]:shadow-sm sm:min-w-28 sm:flex-none";

/** A segmented switch: grey track, the active language raised in white. */
export function LanguageTabs({ defaultValue = "ml", children }: LanguageTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-5">
      <TabsList className="h-auto w-full gap-1 rounded-lg bg-[var(--admin-pill)] p-1 sm:w-fit">
        <TabsTrigger value="ml" className={TRIGGER}>
          മലയാളം
        </TabsTrigger>
        <TabsTrigger value="en" className={TRIGGER}>
          English
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}

interface LanguageTabProps {
  value: "ml" | "en";
  children: React.ReactNode;
}

export function LanguageTab({ value, children }: LanguageTabProps) {
  return <TabsContent value={value}>{children}</TabsContent>;
}
