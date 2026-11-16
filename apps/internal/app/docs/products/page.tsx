"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, EmptyState, Field, Input, Panel, Select, Spinner, Textarea } from "@/components/odh";
import { ApiError, registers, type ProductBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, vatTypeLabels } from "@/lib/docs";
import { interestLabels, labelOf } from "@/lib/labels";
import type { Product } from "@/lib/types";

const blank: ProductBody = {
  code: "",
  name: "",
  description: "",
  product_type: 2,
  unit_name: "",
  sell_price: "0",
  sell_vat_type: 3,
  interest: "",
  active: true,
};

/**
 * Items sold often, picked on the document form to fill a line. Admin only:
 * a code here is what the accounting firm will match in PEAK. An item is
 * switched off rather than deleted, since documents point at it.
 */
export default function ProductsPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["registers", "products", "all"], queryFn: () => registers.products(true), enabled: isAdmin });
  const [editing, setEditing] = useState<{ id: number; body: ProductBody } | null>(null);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: (target: { id: number; body: ProductBody }) =>
      target.id ? registers.updateProduct(target.id, target.body) : registers.createProduct(target.body),
    onSuccess: async () => {
      setEditing(null);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
      await queryClient.invalidateQueries({ queryKey: ["docs"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
    meta: { success: "บันทึกสินค้า/บริการแล้ว" },
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">ทะเบียนสินค้า/บริการแก้ได้เฉพาะแอดมิน</Alert>;

  const rows = list.data?.items ?? [];
  const startEdit = (p: Product) => {
    const { id, ...body } = p;
    setEditing({ id, body: { ...body, sell_price: String(Number(body.sell_price)) } });
    setError("");
  };
  const set = <K extends keyof ProductBody>(key: K, value: ProductBody[K]) =>
    setEditing((e) => (e ? { ...e, body: { ...e.body, [key]: value } } : e));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">สินค้า/บริการ</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            รายการที่ขายบ่อย เลือกในฟอร์มเอกสารแล้วระบบเติมชื่อ หน่วย ราคา และ VAT ให้ ปิดการใช้แทนการลบ เพราะเอกสารเก่ายังอ้างถึง
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing({ id: 0, body: blank }); setError(""); }}>
          <Plus className="size-4" aria-hidden /> เพิ่มรายการ
        </Button>
      </header>

      {editing ? (
        <Panel title={editing.id ? `แก้ไข ${editing.body.code}` : "เพิ่มรายการ"}>
          <form
            className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <Field label="รหัส" required hint="ตรงกับรหัสใน PEAK ได้ เช่น S-001">
              <Input value={editing.body.code} maxLength={32} onChange={(e) => set("code", e.target.value)} required />
            </Field>
            <Field label="ชื่อ" required>
              <Input value={editing.body.name} maxLength={255} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="ประเภท">
              <Select value={editing.body.product_type} onChange={(e) => set("product_type", Number(e.target.value))}>
                <option value={2}>บริการ</option>
                <option value={1}>สินค้า</option>
              </Select>
            </Field>
            <Field label="หน่วย">
              <Input value={editing.body.unit_name} maxLength={50} placeholder="งาน, วัน, ชิ้น" onChange={(e) => set("unit_name", e.target.value)} />
            </Field>
            <Field label="ราคาตั้งต้น (ก่อน VAT)">
              <Input inputMode="decimal" value={editing.body.sell_price} onChange={(e) => set("sell_price", e.target.value)} />
            </Field>
            <Field label="VAT">
              <Select value={editing.body.sell_vat_type} onChange={(e) => set("sell_vat_type", Number(e.target.value))}>
                {[3, 1, 2].map((v) => (
                  <option key={v} value={v}>
                    {vatTypeLabels[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="บริการใน Lead Tracker" hint="ใช้แยกรายได้ตามบริการ">
              <Select value={editing.body.interest} onChange={(e) => set("interest", e.target.value)}>
                <option value="">ไม่ผูก</option>
                {Object.entries(interestLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="สถานะ">
              <Select value={editing.body.active ? "1" : "0"} onChange={(e) => set("active", e.target.value === "1")}>
                <option value="1">ใช้งาน</option>
                <option value="0">ปิดการใช้</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="รายละเอียด">
                <Textarea value={editing.body.description} maxLength={1000} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            {error ? <div className="sm:col-span-2"><Alert tone="stop">{error}</Alert></div> : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={save.isPending}>บันทึก</Button>
              <Button type="button" size="sm" variant="line" onClick={() => setEditing(null)}>ยกเลิก</Button>
            </div>
          </form>
        </Panel>
      ) : null}

      {list.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="ยังไม่มีสินค้า/บริการ" hint="เพิ่มรายการที่ออกใบเสนอราคาบ่อย ๆ" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => startEdit(p)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-muted sm:grid-cols-[100px_minmax(0,1fr)_160px_140px]",
                  !p.active && "opacity-60",
                )}
              >
                <span className="font-mono text-sm text-muted-foreground">{p.code}</span>
                <span className="col-start-1 min-w-0 truncate font-display text-sm font-semibold text-foreground sm:col-start-auto">
                  {p.name}
                  {!p.active ? <span className="ml-2 font-body text-xs font-normal text-muted-foreground">ปิดการใช้</span> : null}
                </span>
                <span className="hidden font-body text-xs text-muted-foreground sm:block">
                  {p.interest ? labelOf(interestLabels, p.interest) : "—"} · {vatTypeLabels[p.sell_vat_type]}
                </span>
                <span className="col-start-2 row-span-2 row-start-1 self-center text-right font-mono text-sm tabular-nums text-foreground sm:col-start-auto sm:row-span-1 sm:row-start-auto">
                  {money(p.sell_price)}
                  {p.unit_name ? <span className="text-muted-foreground"> /{p.unit_name}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
