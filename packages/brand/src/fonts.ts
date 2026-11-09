// @odh/brand — font configuration via next/font (self-hosted, no layout shift).
// Bricolage Grotesque + Anuphan = display; IBM Plex Sans Thai = body; DM Mono = labels.
import { Anuphan, Bricolage_Grotesque, DM_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  display: "swap",
  variable: "--font-bricolage",
});

export const displayThai = Anuphan({
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-anuphan",
});

export const body = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-thai",
});

export const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});

/** Apply on <html> so theme.css can resolve the font tokens. */
export const fontVariables = `${display.variable} ${displayThai.variable} ${body.variable} ${mono.variable}`;
