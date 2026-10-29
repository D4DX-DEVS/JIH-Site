import type { Metadata, Viewport } from "next";
import { Anek_Malayalam, Noto_Sans_Malayalam, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// English is set in Poppins. The Malayalam faces load only their Malayalam subset, so the browser
// takes Latin letters from Poppins and Malayalam letters from the font that follows it in the stack.
const latin = Poppins({
  variable: "--font-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const display = Anek_Malayalam({
  variable: "--font-display",
  subsets: ["malayalam"],
  display: "swap",
});

const body = Noto_Sans_Malayalam({
  variable: "--font-body",
  subsets: ["malayalam"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Jamaat-e-Islami Hind Kerala | JIH Kerala",
    template: "%s - Jamaat-e-Islami Hind Kerala",
  },
  description:
    "Jamaat-e-Islami Hind Kerala is a socio-religious organization of India that aims to uphold a way of life that submits to the will of God.",
  applicationName: "JIH Kerala",
  openGraph: { siteName: "Jamaat-e-Islami Hind Kerala", locale: "ml_IN", type: "website" },
  twitter: { card: "summary_large_image", site: "@JIHkerala" },
};

export const viewport: Viewport = {
  themeColor: "#071e7f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ml" className={`${latin.variable} ${display.variable} ${body.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <noscript>
          {/* Scroll entrances start hidden; without script they must stay visible. */}
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
