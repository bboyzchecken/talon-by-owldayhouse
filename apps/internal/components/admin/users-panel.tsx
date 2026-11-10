"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Spinner, Textarea } from "@/components/ui";
import { ApiError, admin as adminApi } from "@/lib/api";
import { buildAccountMessage, loginUrl } from "@/lib/account-message";
import { roleLabels } from "@/lib/labels";
import type { Role } from "@/lib/types";

interface Handoff {
  name: string;
  username: string;
  password: string;
  role: Role;
  kind: "new" | "reset";
}

/**
 * Accounts. There is no e-mail in this system, so a new password is shown once
 * in the response, together with a ready-made message the admin copies and
 * sends to the account's owner. Nothing is ever sent from here.
 */
export function UsersPanel() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "sales", password: "" });
  const [error, setError] = useState("");
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"message" | "password" | null>(null);
  const [copyError, setCopyError] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);

  // The tools and the sign-in page share one origin, so the link in the
  // message is simply where this page is being read from.
  useEffect(() => setOrigin(window.location.origin), []);

  function openHandoff(next: Handoff) {
    setHandoff(next);
    setMessage(buildAccountMessage({ ...next, origin }));
    setCopied(null);
    setCopyError("");
  }

  function closeHandoff() {
    setHandoff(null);
    setMessage("");
    setCopied(null);
    setCopyError("");
  }

  async function copy(kind: "message" | "password", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyError("");
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setCopyError("คัดลอกอัตโนมัติไม่ได้ — เลือกข้อความแล้วคัดลอกเอง");
    }
  }

  const { data, isLoading } = useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.listUsers });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        username: form.username.trim(),
        name: form.name.trim(),
        role: form.role,
        password: form.password || undefined,
      }),
    onSuccess: async (result) => {
      setError("");
      setAdding(false);
      // A password the admin typed never comes back in the response, so the
      // message is built from whichever of the two we have.
      const password = result.password || form.password;
      if (password) {
        openHandoff({
          name: result.user.name,
          username: result.user.username,
          password,
          role: result.user.role,
          kind: "new",
        });
      }
      setForm({ username: "", name: "", role: "sales", password: "" });
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "สร้างบัญชีไม่สำเร็จ"),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminApi.updateUser(id, { status }),
    onSuccess: async () => {
      setError("");
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "แก้บัญชีไม่สำเร็จ"),
  });

  const reset = useMutation({
    mutationFn: (id: number) => adminApi.resetPassword(id),
    onSuccess: (result) => {
      setError("");
      if (result.password) {
        openHandoff({
          name: result.user.name,
          username: result.user.username,
          password: result.password,
          role: result.user.role,
          kind: "reset",
        });
      }
    },
    onError: (caught) => setError((caught as ApiError).body?.error ?? "รีเซ็ตรหัสไม่สำเร็จ"),
  });

  const users = data?.data ?? [];

  return (
    <Panel
      title={`ผู้ใช้ (${users.length})`}
      action={
        <Button size="sm" variant="line" onClick={() => setAdding((current) => !current)}>
          <UserPlus className="size-4" aria-hidden />
          เพิ่มบัญชี
        </Button>
      }
    >
      {error ? <Alert tone="stop">{error}</Alert> : null}

      {handoff ? (
        <div className="mb-4 rounded-xl border border-gold bg-gold-soft p-4">
          <p className="font-display font-semibold text-navy">
            {handoff.kind === "new"
              ? `สร้างบัญชีของ ${handoff.name} แล้ว`
              : `รีเซ็ตรหัสผ่านของ ${handoff.name} แล้ว`}
          </p>
          <p className="mt-1 font-body text-xs text-navy">
            แสดงครั้งเดียว — คัดลอกข้อความด้านล่างไปส่งให้เจ้าของบัญชีทาง LINE หรือ Messenger
            ระบบไม่ส่งอีเมล
          </p>

          <dl className="mt-3 grid gap-1 font-mono text-sm text-navy sm:grid-cols-[auto_1fr] sm:gap-x-3">
            <dt className="font-body text-xs text-navy/70">ชื่อผู้ใช้</dt>
            <dd>{handoff.username}</dd>
            <dt className="font-body text-xs text-navy/70">รหัสผ่าน</dt>
            <dd className="flex items-center gap-2">
              <span className="text-base">{handoff.password}</span>
              <button
                type="button"
                onClick={() => copy("password", handoff.password)}
                className="font-display text-xs font-semibold text-navy underline"
              >
                {copied === "password" ? "คัดลอกแล้ว" : "คัดลอกรหัส"}
              </button>
            </dd>
            <dt className="font-body text-xs text-navy/70">ลิงก์</dt>
            <dd className="break-all">{loginUrl(origin)}</dd>
          </dl>

          <div className="mt-3">
            <Field label="ข้อความส่งให้เจ้าของบัญชี" hint="แก้ข้อความได้ก่อนคัดลอก">
              <Textarea
                rows={12}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="bg-white font-mono text-sm"
              />
            </Field>
          </div>

          {copyError ? (
            <p className="mt-2 font-body text-xs font-semibold text-ink">{copyError}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copy("message", message)}>
              {copied === "message" ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied === "message" ? "คัดลอกข้อความแล้ว" : "คัดลอกข้อความ"}
            </Button>
            <Button size="sm" variant="line" onClick={closeHandoff}>
              ปิด
            </Button>
          </div>
        </div>
      ) : null}

      {adding ? (
        <div className="mb-4 space-y-3 rounded-xl border border-line p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อผู้ใช้" required hint="ตัวพิมพ์เล็ก ไม่มีเว้นวรรค">
              <Input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                autoCapitalize="none"
              />
            </Field>
            <Field label="ชื่อที่แสดง" required>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="สิทธิ์" required>
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="sales">{roleLabels.sales}</option>
                <option value="admin">{roleLabels.admin}</option>
              </Select>
            </Field>
            <Field label="รหัสผ่าน" hint="เว้นว่างไว้เพื่อให้ระบบสุ่มให้ (แสดงครั้งเดียว)">
              <Input
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => create.mutate()}
              disabled={create.isPending || !form.username.trim() || !form.name.trim()}
            >
              สร้างบัญชี
            </Button>
            <Button size="sm" variant="line" onClick={() => setAdding(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <Spinner />
      ) : (
        <ul className="divide-y divide-line">
          {users.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-ink">
                  {person.name}{" "}
                  <span className="font-mono text-xs font-normal text-muted">@{person.username}</span>
                </p>
                <p className="font-body text-xs text-muted">
                  {roleLabels[person.role]} ·{" "}
                  {person.status === "active" ? "ใช้งานอยู่" : "ปิดการใช้งาน"}
                </p>
              </div>
              <Button
                size="sm"
                variant="line"
                onClick={() => {
                  if (window.confirm(`รีเซ็ตรหัสผ่านของ ${person.name}?`)) reset.mutate(person.id);
                }}
              >
                <KeyRound className="size-4" aria-hidden />
                รีเซ็ตรหัส
              </Button>
              <Button
                size="sm"
                variant="line"
                onClick={() =>
                  update.mutate({
                    id: person.id,
                    status: person.status === "active" ? "deactivated" : "active",
                  })
                }
              >
                {person.status === "active" ? "ปิดบัญชี" : "เปิดบัญชี"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
