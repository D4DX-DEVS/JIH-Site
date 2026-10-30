import { Anek_Malayalam, Noto_Sans_Malayalam, Poppins } from "next/font/google";

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

/** Font variables for the <html> of each root layout (the public site and the admin). */
export const fontVariables = `${latin.variable} ${display.variable} ${body.variable}`;
