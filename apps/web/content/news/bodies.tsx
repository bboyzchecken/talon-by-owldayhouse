import type { ComponentType } from "react";
import KepRaichueLukkhaNaBoothPdpa from "./kep-raichue-lukkha-na-booth-pdpa";
import NganPoetTuaKhrongkanSongLeadSales from "./ngan-poet-tua-khrongkan-song-lead-sales";
import OpenHouseWatPhonPhuSamak from "./open-house-wat-phon-phu-samak";
import ThurakitPrapTuaYukAi from "./thurakit-prap-tua-yuk-ai";
import RabThamWebsiteKrungthep from "./rab-tham-website-krungthep";
import RabThamWebsiteChiangMaiRakha from "./rab-tham-website-chiang-mai-rakha";
import ThurakitChiangMaiTongMiWebsite from "./thurakit-chiang-mai-tong-mi-website";

// slug → article body component. Keep in sync with content/news.ts (posts).
export const bodies: Record<string, ComponentType> = {
  "ngan-poet-tua-khrongkan-song-lead-sales": NganPoetTuaKhrongkanSongLeadSales,
  "open-house-wat-phon-phu-samak": OpenHouseWatPhonPhuSamak,
  "kep-raichue-lukkha-na-booth-pdpa": KepRaichueLukkhaNaBoothPdpa,
  "thurakit-prap-tua-yuk-ai": ThurakitPrapTuaYukAi,
  "rab-tham-website-krungthep": RabThamWebsiteKrungthep,
  "rab-tham-website-chiang-mai-rakha": RabThamWebsiteChiangMaiRakha,
  "thurakit-chiang-mai-tong-mi-website": ThurakitChiangMaiTongMiWebsite,
};
