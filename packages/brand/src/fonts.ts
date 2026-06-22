// @odh/brand — font configuration via next/font (self-hosted, no layout shift).
// Space Grotesk = display / numbers (tech feel); IBM Plex Sans Thai = Thai body.
import { Space_Grotesk, IBM_Plex_Sans_Thai } from "next/font/google";

export const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const body = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-thai",
});

/** Apply on <html> so theme.css can resolve --font-display / --font-body. */
export const fontVariables = `${display.variable} ${body.variable}`;
