// Talon offer + monthly care plans. ฿3,900 and 390/690/990 are from the plan;
// feature wording is a starting draft to refine in Step 6.

export interface TalonPackage {
  name: string;
  price: string;
  period: string;
  includes: readonly string[];
}

export interface CarePlan {
  name: string;
  price: number; // THB per month
  blurb: string;
  features: readonly string[];
  highlighted?: boolean;
}

export const talon: TalonPackage = {
  name: "Talon",
  price: "฿3,900",
  period: "จ่ายครั้งเดียว",
  includes: [
    "เว็บดีไซน์โปร ออกแบบและปรับแต่งโดยทีมคนไทย",
    "เนื้อหา + รูปภาพเริ่มต้น พร้อมใช้งาน",
    "ปุ่มติดต่อ Messenger / โทร / LINE",
    "เชื่อมโดเมนของคุณ + แสดงผลบนมือถือสวย",
    "ส่งมอบใน 5 วันทำการ",
  ],
};

export const firstMonthFree = true;

export const carePlans: readonly CarePlan[] = [
  {
    name: "ดูแลพื้นฐาน",
    price: 390,
    blurb: "เหมาะกับเว็บโปรไฟล์",
    features: ["โฮสติ้ง + ต่ออายุโดเมน", "สำรองข้อมูลรายเดือน", "แก้เนื้อหาเล็กน้อย 1 ครั้ง/เดือน"],
  },
  {
    name: "ดูแลธุรกิจ",
    price: 690,
    blurb: "ยอดนิยม",
    features: [
      "ทุกอย่างในแพ็กพื้นฐาน",
      "แก้เนื้อหา 3 ครั้ง/เดือน",
      "รายงานสถิติการเข้าชม",
      "ตอบกลับภายใน 1 วันทำการ",
    ],
    highlighted: true,
  },
  {
    name: "ดูแลเต็มที่",
    price: 990,
    blurb: "สำหรับเว็บที่อัปเดตบ่อย",
    features: ["ทุกอย่างในแพ็กธุรกิจ", "แก้เนื้อหาไม่จำกัด*", "ปรับ SEO ต่อเนื่อง", "ดูแลด่วนทาง LINE"],
  },
];
