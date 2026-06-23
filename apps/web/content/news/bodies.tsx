import type { ComponentType } from "react";
import ThurakitPrapTuaYukAi from "./thurakit-prap-tua-yuk-ai";
import RabThamWebsiteKrungthep from "./rab-tham-website-krungthep";
import RabThamWebsiteChiangMaiRakha from "./rab-tham-website-chiang-mai-rakha";
import ThurakitChiangMaiTongMiWebsite from "./thurakit-chiang-mai-tong-mi-website";

// slug → article body component. Keep in sync with content/news.ts (posts).
export const bodies: Record<string, ComponentType> = {
  "thurakit-prap-tua-yuk-ai": ThurakitPrapTuaYukAi,
  "rab-tham-website-krungthep": RabThamWebsiteKrungthep,
  "rab-tham-website-chiang-mai-rakha": RabThamWebsiteChiangMaiRakha,
  "thurakit-chiang-mai-tong-mi-website": ThurakitChiangMaiTongMiWebsite,
};
