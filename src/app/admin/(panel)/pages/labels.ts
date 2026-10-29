import type { PageSection, PageTemplate } from "@/db/schema";

export const SECTION_LABELS: Record<PageSection, string> = {
  general: "General",
  about: "About",
  department: "Departments",
  publication: "Media and publications",
  feeder: "Feeder organisations",
};

export const TEMPLATE_LABELS: Record<PageTemplate, string> = {
  default: "Standard page",
  hub: "Section hub",
  contact: "Contact",
  leaders: "Leaders",
  news: "News archive",
};
