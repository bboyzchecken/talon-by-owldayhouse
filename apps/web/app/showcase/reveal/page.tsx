import { pageMeta } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import { RevealHero } from "@/components/RevealHero";

export const metadata = pageMeta({
  title: "โชว์เคส Interactive",
  description:
    "เดโมงานหน้าเว็บเชิงโต้ตอบของ Owl Day House — เลื่อนเคอร์เซอร์ส่องสปอตไลต์ทะลุดีไซน์ที่เสร็จสวย ลงไปเห็นโครงสร้างระบบเบื้องหลัง สื่อแนวคิดจากเว็บแรก ฿3,900 สู่ระบบระดับองค์กร",
  path: "/showcase/reveal/",
});

export default function ShowcaseRevealPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema("โชว์เคส", "/showcase/reveal/")} />
      <RevealHero />
    </>
  );
}
