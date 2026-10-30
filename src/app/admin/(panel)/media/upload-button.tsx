"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia } from "@/components/admin/media-upload";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTRIBUTE } from "@/lib/upload-rules";

/** Uploads one or more files in sequence and refreshes the library when done. */
export function UploadButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const onFiles = async (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    let uploaded = 0;
    for (const [i, file] of files.entries()) {
      setProgress({ done: i, total: files.length });
      const result = await uploadMedia(file);
      if (result.ok) uploaded++;
      else toast.error(`${file.name}: ${result.error}`);
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    if (uploaded) {
      toast.success(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
      router.refresh();
    }
  };

  return (
    <>
      <input ref={input} id="library-upload" type="file" accept={ACCEPT_ATTRIBUTE} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} tabIndex={-1} />
      <Button type="button" className="h-9 sm:h-8" disabled={!!progress} onClick={() => input.current?.click()}>
        {progress ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : "Upload files"}
      </Button>
    </>
  );
}
