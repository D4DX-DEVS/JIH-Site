"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moveNavItemAction } from "./actions";

export function MoveButtons({ id, label, first, last }: { id: number; label: string; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      const result = await moveNavItemAction(id, direction);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  return (
    <>
      <Button type="button" variant="ghost" size="icon" className="size-9 sm:size-8" disabled={pending || first} onClick={() => move("up")} aria-label={`Move ${label} up`}>
        <ArrowUp className="size-4" aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-9 sm:size-8" disabled={pending || last} onClick={() => move("down")} aria-label={`Move ${label} down`}>
        <ArrowDown className="size-4" aria-hidden="true" />
      </Button>
    </>
  );
}
