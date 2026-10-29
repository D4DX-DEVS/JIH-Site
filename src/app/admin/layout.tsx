import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · JIH Kerala admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="admin-theme min-h-svh font-sans">{children}</div>;
}
