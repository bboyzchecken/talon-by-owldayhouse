import { Button } from "./button";
import { OwlLogo } from "./owl-logo";
import { SectionHeading } from "./section-heading";

/** Quick visual check that tokens and shared components render. */
export function Showcase() {
  return (
    <div className="flex flex-col gap-10 bg-white p-8 font-body text-ink">
      <OwlLogo height={44} className="text-ink" />
      <SectionHeading
        eyebrow="ODH Design System"
        title="ทีมเดียว ตั้งแต่ระบบถึงหน้างาน"
        subtitle="พื้นขาวเป็นหลัก น้ำเงินและทองเฉพาะจุดสำคัญ"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="key">คุยโปรเจกต์</Button>
        <Button variant="line">ดูผลงาน</Button>
        <Button variant="key" size="sm">
          ขนาด sm
        </Button>
        <Button variant="key" asChild>
          <a href="https://m.me/owldayhouse">ปุ่มที่เป็นลิงก์</a>
        </Button>
      </div>
    </div>
  );
}
