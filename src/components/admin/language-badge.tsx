import { Badge } from "@/components/ui/badge";

interface LanguageBadgeProps {
  ml: boolean;
  en: boolean;
}

export function LanguageBadge({ ml, en }: LanguageBadgeProps) {
  if (ml && en) {
    return null; // Both languages present, no badge needed
  }
  if (!ml && !en) {
    return <Badge variant="destructive">Empty</Badge>;
  }
  return (
    <Badge variant="outline" className="gap-1" title={ml ? "No English text yet" : "No Malayalam text yet"}>
      {ml ? "ML only" : "EN only"}
    </Badge>
  );
}
