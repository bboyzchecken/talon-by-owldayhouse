import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import { OwlLogo } from "./owl-logo";
import { SectionHeading } from "./section-heading";

/**
 * Quick visual story of the ODH design system. Drop into any page
 * (e.g. apps/web in Step 2) to confirm tokens + components render.
 */
export function Showcase() {
  return (
    <div className="flex flex-col gap-10 bg-paper p-8 font-body text-ink">
      <div className="flex items-center gap-4">
        <OwlLogo height={44} className="text-navy" />
        <Badge variant="gold" className="ml-auto">
          NEW
        </Badge>
      </div>

      <SectionHeading
        eyebrow="ODH Design System"
        title="จากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร"
        subtitle="โครงสะอาด น่าเชื่อถือ + ตื่นเต้นด้วยสีทอง — คุมแบรนด์ด้วย token ชุดเดียว"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gold">เริ่มเลย ฿3,900</Button>
        <Button variant="navy">ดูผลงาน</Button>
        <Button variant="ghost">ติดต่อเรา</Button>
        <Button variant="gold" size="sm">
          ขนาด sm
        </Button>
        <Button variant="gold" size="lg">
          ขนาด lg
        </Button>
        <Button variant="gold" asChild>
          <a href="https://m.me/owldayhouse">ปุ่มที่เป็นลิงก์ (asChild)</a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Badge variant="soft">เว็บไว</Badge>
          <p className="mt-3 font-display text-lg font-bold text-navy">Talon</p>
          <p className="mt-1 text-sm text-muted">เว็บไซต์ไวด้วย AI เสร็จใน 5 วัน</p>
        </Card>
        <Card>
          <Badge variant="soft">เว็บธุรกิจ</Badge>
          <p className="mt-3 font-display text-lg font-bold text-navy">Business</p>
          <p className="mt-1 text-sm text-muted">เว็บบริษัทเต็มรูปแบบ</p>
        </Card>
        <Card>
          <Badge variant="soft">องค์กร</Badge>
          <p className="mt-3 font-display text-lg font-bold text-navy">Enterprise</p>
          <p className="mt-1 text-sm text-muted">ระบบราชการ / มหาวิทยาลัย</p>
        </Card>
      </div>
    </div>
  );
}
