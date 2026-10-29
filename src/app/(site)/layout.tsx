import { BackToTop } from "@/components/site/back-to-top";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {/* tabIndex -1: the skip link and the back-to-top button move focus here. */}
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
      <BackToTop />
    </>
  );
}
