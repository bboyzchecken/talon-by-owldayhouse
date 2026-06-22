import type { MetadataRoute } from "next";
import { colors } from "@odh/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Owl Day House",
    short_name: "ODH",
    description: "ซอฟต์แวร์เฮาส์เชียงใหม่ — รับทำเว็บไซต์ เว็บแอป และระบบองค์กร",
    start_url: "/",
    display: "standalone",
    background_color: colors.paper,
    theme_color: colors.navy,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
