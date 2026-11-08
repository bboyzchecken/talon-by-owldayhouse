import type { MetadataRoute } from "next";
import { colors } from "@odh/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Owl Day House",
    short_name: "ODH",
    description: "Software, event experiences, KOL campaigns and digital marketing from Chiang Mai.",
    start_url: "/",
    display: "standalone",
    background_color: colors.white,
    theme_color: colors.white,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
