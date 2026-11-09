"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { Button } from "@odh/ui";
import { Alert, Field, Input, Panel, Select, Spinner } from "@/components/ui";
import { ApiError, admin as adminApi } from "@/lib/api";
import { roleLabels } from "@/lib/labels";

/**
 * Accounts. There is no e-mail in this system, so a new password is shown once
 * in the response and the admin passes it on; nothing is ever sent anywhere.
 */
export function UsersPanel() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", role: "sales", password: "" });
  const [error, setError] = useState("");
  const [shownPassword, setShownPassword] = useState<{ username: string; password: string } | null>(null);

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
      setForm({ username: "", name: "", role: "sales", password: "" });
      if (result.password) {
        setShownPassword({ username: result.user.username, password: result.password });
      }
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
        setShownPassword({ username: result.user.username, password: result.password });
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

      {shownPassword ? (
        <Alert>
          <p className="font-display font-semibold">
            รหัสผ่านของ {shownPassword.username}
          </p>
          <p className="mt-1 font-mono text-base">{shownPassword.password}</p>
          <p className="mt-1 text-xs">
            แสดงครั้งเดียว — คัดลอกไปส่งให้เจ้าของบัญชีเอง ระบบไม่ส่งอีเมล
          </p>
          <button
            type="button"
            onClick={() => setShownPassword(null)}
            className="mt-2 font-display text-sm font-semibold underline"
          >
            ปิด
          </button>
        </Alert>
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
