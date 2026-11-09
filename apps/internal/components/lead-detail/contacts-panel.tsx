"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, EmptyState, Field, Input, Panel, Spinner } from "@/components/ui";
import { ApiError, leads as leadsApi } from "@/lib/api";
import { lineHref, telHref } from "@/lib/format";

/**
 * The people at the customer company. These are personal data under the PDPA:
 * only signed-in accounts ever see them, and every row has a delete button.
 */
export function ContactsPanel({ leadId, canEdit }: { leadId: number; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", position: "", phone: "", line_id: "", email: "", note: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["leads", leadId, "contacts"],
    queryFn: () => leadsApi.contacts.list(leadId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["leads", leadId] });

  const create = useMutation({
    mutationFn: () => leadsApi.contacts.create(leadId, form),
    onSuccess: async () => {
      setForm({ name: "", position: "", phone: "", line_id: "", email: "", note: "" });
      setAdding(false);
      setError("");
      await invalidate();
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "เพิ่มผู้ติดต่อไม่สำเร็จ"),
  });

  const remove = useMutation({
    mutationFn: (contactId: number) => leadsApi.contacts.remove(leadId, contactId),
    onSuccess: invalidate,
    onError: (caught) => setError((caught as ApiError).body?.error ?? "ลบผู้ติดต่อไม่สำเร็จ"),
  });

  const contacts = data?.data ?? [];

  return (
    <Panel
      title={`ผู้ติดต่อ (${contacts.length})`}
      action={
        canEdit ? (
          <Button size="sm" variant="line" onClick={() => setAdding((current) => !current)}>
            <Plus className="size-4" aria-hidden />
            เพิ่ม
          </Button>
        ) : null
      }
    >
      {error ? <Alert>{error}</Alert> : null}

      {adding ? (
        <div className="mb-4 space-y-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อ" required>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="ตำแหน่ง">
              <Input
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              />
            </Field>
            <Field label="เบอร์โทร">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                inputMode="tel"
              />
            </Field>
            <Field label="LINE ID">
              <Input
                value={form.line_id}
                onChange={(event) => setForm({ ...form, line_id: event.target.value })}
              />
            </Field>
            <Field label="อีเมล" hint="เก็บเป็นข้อมูลเท่านั้น ระบบไม่ส่งอีเมล">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="หมายเหตุ">
              <Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => create.mutate()} disabled={!form.name.trim() || create.isPending}>
              บันทึก
            </Button>
            <Button size="sm" variant="line" onClick={() => setAdding(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : contacts.length === 0 ? (
        <EmptyState title="ยังไม่มีผู้ติดต่อ" hint="เพิ่มชื่อ เบอร์ และ LINE เพื่อกดโทรหรือแชทได้ทันที" />
      ) : (
        <ul className="divide-y divide-line">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-ink">
                  {contact.name}
                  {contact.position ? (
                    <span className="font-body font-normal text-muted"> · {contact.position}</span>
                  ) : null}
                </p>
                {contact.email ? <p className="font-body text-xs text-muted">{contact.email}</p> : null}
                {contact.note ? <p className="font-body text-xs text-muted">{contact.note}</p> : null}
              </div>

              <div className="flex items-center gap-2">
                {contact.phone ? (
                  <a
                    href={telHref(contact.phone)}
                    className="flex h-10 items-center gap-1.5 rounded-full bg-navy px-3 font-display text-sm font-semibold text-white"
                  >
                    <Phone className="size-4" aria-hidden />
                    โทร
                  </a>
                ) : null}
                {contact.line_id ? (
                  <a
                    href={lineHref(contact.line_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center gap-1.5 rounded-full border border-line px-3 font-display text-sm font-semibold text-ink"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    LINE
                  </a>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`ลบผู้ติดต่อ ${contact.name}?`)) remove.mutate(contact.id);
                    }}
                    className="flex size-10 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-ink hover:text-ink"
                    aria-label={`ลบผู้ติดต่อ ${contact.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
