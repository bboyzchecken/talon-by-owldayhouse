"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, cn } from "@odh/ui";
import { Alert, EmptyState, Field, Input, Panel, Select, Spinner } from "@/components/odh";
import { ApiError, registers, type PaymentMethodBody } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { paymentMethodTypeLabels } from "@/lib/docs";
import type { PaymentMethod } from "@/lib/types";

const blank: PaymentMethodBody = { code: "", name: "", method_type: 2, bank_name: "", account_no: "", active: true };

/**
 * Where money comes in and goes out. Recording a payment against an invoice
 * (step 5) picks one of these; PEAK takes the same list as paymentMethodCode.
 */
export default function PaymentMethodsPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["registers", "payment-methods", "all"], queryFn: () => registers.paymentMethods(true), enabled: isAdmin });
  const [editing, setEditing] = useState<{ id: number; body: PaymentMethodBody } | null>(null);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: (target: { id: number; body: PaymentMethodBody }) =>
      target.id ? registers.updatePaymentMethod(target.id, target.body) : registers.createPaymentMethod(target.body),
    onSuccess: async () => {
      setEditing(null);
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "บันทึกไม่สำเร็จ"),
    meta: { success: "บันทึกช่องทางรับเงินแล้ว" },
  });

  if (loading) return <Spinner />;
  if (!isAdmin) return <Alert tone="stop">ช่องทางรับเงินแก้ได้เฉพาะแอดมิน</Alert>;

  const rows = list.data?.items ?? [];
  const set = <K extends keyof PaymentMethodBody>(key: K, value: PaymentMethodBody[K]) =>
    setEditing((e) => (e ? { ...e, body: { ...e.body, [key]: value } } : e));
  const startEdit = (m: PaymentMethod) => {
    const { id, ...body } = m;
    setEditing({ id, body });
    setError("");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">ช่องทางรับเงิน</h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-muted-foreground">
            บัญชีธนาคาร เงินสด หรือ e-Wallet ที่ใช้รับและจ่ายเงิน ใช้ตอนบันทึกรับเงินของใบแจ้งหนี้ในขั้นถัดไป
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing({ id: 0, body: blank }); setError(""); }}>
          <Plus className="size-4" aria-hidden /> เพิ่มช่องทาง
        </Button>
      </header>

      {editing ? (
        <Panel title={editing.id ? `แก้ไข ${editing.body.code}` : "เพิ่มช่องทาง"}>
          <form
            className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <Field label="รหัส" required>
              <Input value={editing.body.code} maxLength={32} placeholder="BANK-01" onChange={(e) => set("code", e.target.value)} required />
            </Field>
            <Field label="ชื่อ" required>
              <Input value={editing.body.name} maxLength={200} placeholder="กสิกรไทย ออมทรัพย์" onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="ประเภท">
              <Select value={editing.body.method_type} onChange={(e) => set("method_type", Number(e.target.value))}>
                {Object.entries(paymentMethodTypeLabels).map(([value, label]) => (
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
            {editing.body.method_type === 2 ? (
              <>
                <Field label="ธนาคาร" required>
                  <Input value={editing.body.bank_name} maxLength={100} onChange={(e) => set("bank_name", e.target.value)} />
                </Field>
                <Field label="เลขที่บัญชี" required>
                  <Input value={editing.body.account_no} maxLength={40} onChange={(e) => set("account_no", e.target.value)} />
                </Field>
              </>
            ) : null}
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
        <EmptyState title="ยังไม่มีช่องทางรับเงิน" hint="เพิ่มบัญชีธนาคารของบริษัทก่อนเริ่มบันทึกรับเงิน" />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {rows.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => startEdit(m)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 px-4 py-3 text-left hover:bg-muted sm:grid-cols-[110px_minmax(0,1fr)_220px]",
                  !m.active && "opacity-60",
                )}
              >
                <span className="font-mono text-sm text-muted-foreground">{m.code}</span>
                <span className="col-start-1 font-display text-sm font-semibold text-foreground sm:col-start-auto">
                  {m.name}
                  <span className="ml-2 font-body text-xs font-normal text-muted-foreground">
                    {paymentMethodTypeLabels[m.method_type]}
                    {!m.active ? " · ปิดการใช้" : ""}
                  </span>
                </span>
                <span className="col-start-2 row-start-1 self-center text-right font-mono text-xs text-muted-foreground sm:col-start-auto sm:row-start-auto">
                  {m.method_type === 2 ? `${m.bank_name} ${m.account_no}` : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
