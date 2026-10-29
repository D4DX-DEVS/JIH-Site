"use client";

import { useState, type ReactNode } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { FormResult } from "@/lib/admin/form-result";

interface FormDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  /** Rendered only while open, so each opening starts from fresh form state. */
  children: (close: () => void) => ReactNode;
}

/** Dialog wrapper for small create/edit forms. Closing is blocked by the form while it saves. */
export function FormDialog({ trigger, title, description, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? children(() => setOpen(false)) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Applies a server FormResult to the form: field errors inline, a toast either way. Returns true on success. */
export function applyFormResult<T extends FieldValues>(form: UseFormReturn<T>, result: FormResult, success: string): boolean {
  if (!result.ok) {
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) form.setError(field as Path<T>, { message });
    toast.error(result.error);
    return false;
  }
  toast.success(result.message ?? success);
  return true;
}
