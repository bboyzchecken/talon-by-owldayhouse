import { AppShell, ToolMenu } from "@/components/app-shell";

export const metadata = { title: "เครื่องมือภายใน" };

export default function HomePage() {
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">เครื่องมือภายใน</h1>
      <p className="mt-1 max-w-2xl font-body text-sm text-muted">
        ระบบภายในของทีม Owl Day House เลือกเครื่องมือที่จะใช้ได้จากด้านล่าง
      </p>
      <div className="mt-6">
        <ToolMenu />
      </div>
    </AppShell>
  );
}
