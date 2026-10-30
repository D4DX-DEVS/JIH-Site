import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site-url";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Admin", template: "%s · JIH Kerala admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#071e7f",
  width: "device-width",
  initialScale: 1,
};

/** Root layout of the admin. The admin works in English; the content it edits is in both languages. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="admin-theme min-h-svh font-sans">{children}</div>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
