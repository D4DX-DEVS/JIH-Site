"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { Archive, Loader2, MailOpen, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setSubmissionStatusAction } from "./actions";

type Status = "new" | "read" | "archived";

/** Marks a new message read once it has been opened, then offers the other status changes. */
export function StatusControls({ id, status }: { id: number; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const marked = useRef(false);

  useEffect(() => {
    if (status !== "new" || marked.current) return;
    marked.current = true;
    void setSubmissionStatusAction(id, "read", { silent: true }).then((r) => r.ok && router.refresh());
  }, [id, status, router]);

  const change = (next: Status) =>
    startTransition(async () => {
      const result = await setSubmissionStatusAction(id, next);
      if (result.ok) {
        toast.success(result.message ?? "Updated");
        router.refresh();
      } else toast.error(result.error);
    });

  const options: Array<{ value: Status; label: string; icon: typeof Mail }> = [
    { value: "new", label: "Mark as unread", icon: Mail },
    { value: "read", label: "Mark as read", icon: MailOpen },
    { value: "archived", label: "Archive", icon: Archive },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options
        .filter((o) => o.value !== status)
        .map((o) => (
          <Button key={o.value} type="button" variant="outline" className="h-9 sm:h-8" disabled={pending} onClick={() => change(o.value)}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <o.icon className="size-4" aria-hidden="true" />}
            {o.label}
          </Button>
        ))}
    </div>
  );
}
