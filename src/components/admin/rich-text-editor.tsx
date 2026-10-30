"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold, Heading2, Heading3, ImagePlus, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo2, Undo2, Unlink, Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { MediaPickerDialog } from "./media-picker";

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="icon" className={cn("size-11 rounded-md text-muted-foreground hover:text-foreground sm:size-8", active && "bg-[var(--admin-sky)] text-primary hover:bg-[var(--admin-sky-deep)] hover:text-primary")} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const apply = () => {
    const url = href.trim();
    if (!url) editor.chain().focus().unsetLink().run();
    else if (/^(https?:\/\/|\/|mailto:|tel:)/.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setHref(editor.getAttributes("link").href ?? ""); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn("size-11 rounded-md text-muted-foreground hover:text-foreground sm:size-8", editor.isActive("link") && "bg-[var(--admin-sky)] text-primary hover:bg-[var(--admin-sky-deep)] hover:text-primary")} aria-label="Link">
          <LinkIcon className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2">
        <label htmlFor="rte-link" className="text-sm font-medium">Link address</label>
        <Input id="rte-link" value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://… or /page/" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => { editor.chain().focus().unsetLink().run(); setOpen(false); }}>
            <Unlink className="size-4" aria-hidden="true" /> Remove
          </Button>
          <Button type="button" size="sm" onClick={apply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Rich text editing for posts, pages and biographies. Output is HTML; the server sanitises it on save. */
export function RichTextEditor({ value, onChange, label, invalid }: { value: string; onChange: (html: string) => void; label: string; invalid?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true } }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-content min-h-80 max-w-none px-4 py-3 focus:outline-none",
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !state)
    return (
      <div className="overflow-hidden rounded-lg border border-input" aria-busy="true">
        <div className="h-11 border-b border-[var(--admin-rule)] bg-[var(--admin-frame)]" />
        <div className="min-h-80 animate-pulse bg-muted/30" />
      </div>
    );

  return (
    <div className={cn("overflow-hidden rounded-lg border border-input bg-card transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15", invalid && "border-destructive")}>
      <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap items-center gap-0.5 border-b border-[var(--admin-rule)] bg-[var(--admin-frame)] p-1.5">
        <ToolButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Heading" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Subheading" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Bulleted list" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Numbered list" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="size-4" aria-hidden="true" /></ToolButton>
        <LinkButton editor={editor} />
        <ToolButton label="Insert image" onClick={() => setPickerOpen(true)}><ImagePlus className="size-4" aria-hidden="true" /></ToolButton>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden="true" />
        <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="size-4" aria-hidden="true" /></ToolButton>
        <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="size-4" aria-hidden="true" /></ToolButton>
      </div>
      <EditorContent editor={editor} />
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(m) => editor.chain().focus().setImage({ src: mediaUrl(m.r2Key), alt: m.altText || "" }).run()}
        title="Insert image"
      />
    </div>
  );
}
