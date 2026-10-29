import type { Metadata } from "next";
import { NotFoundContent } from "./_components/not-found-content";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** 404 raised inside the public site; the (site) layout already supplies header and footer. */
export default function SiteNotFound() {
  return <NotFoundContent />;
}
