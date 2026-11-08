// Single source of truth for company facts and contact channels.
// Marketing site is static: every "contact" action links out (Messenger/phone/LINE).

export const company = {
  legalName: "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด",
  legalNameEn: "Owl Day House Co., Ltd.",
  brandName: "Owl Day House",
  brandNameEn: "OWL DAY HOUSE",
  address: {
    line: "ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172",
    district: "ต.ไชยสถาน อ.สารภี",
    city: "เชียงใหม่",
    postcode: "50140",
  },
  base: "กรุงเทพมหานคร ประเทศไทย",
  baseEn: "Bangkok, Thailand",
  addressEn: "Room B1, 1st Floor, TNC Building, 172 Chai Sathan, Saraphi, Chiang Mai 50140",
} as const;

export const contact = {
  phoneDisplay: "092-455-2450",
  phoneDisplayEn: "+66 92 455 2450",
  phoneTel: "tel:+66924552450",
  messenger: "https://m.me/owldayhouse",
  email: "owldayhouse@gmail.com",
  emailHref: "mailto:owldayhouse@gmail.com",
  // TODO: ยืนยัน LINE official account id ที่ถูกต้องกับลูกค้า
  line: "https://line.me/R/ti/p/@owldayhouse",
} as const;

export const social = {
  facebook: "https://facebook.com/owldayhouse",
  instagram: "https://instagram.com/owldayhouse",
  linkedin: "https://linkedin.com/company/owldayhouse",
} as const;
