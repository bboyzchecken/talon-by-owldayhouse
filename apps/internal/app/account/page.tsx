"use client";

import { useState, type FormEvent } from "react";
import { Alert, Panel } from "@/components/odh";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Changing your own password — the only account screen a sales person has.
 *
 * It matters more here than in most systems: there is no e-mail anywhere in
 * these tools, so nobody can ask for a reset link. Either you change it here,
 * or an admin resets it and hands you the new one over LINE.
 */
export default function AccountPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setDone(false);
    if (next !== confirm) {
      setError("รหัสผ่านใหม่สองช่องไม่ตรงกัน");
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (caught) {
      setError(toApiError(caught).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">บัญชีของฉัน</h1>
      <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 font-body text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <dt className="font-mono text-[11px] uppercase tracking-wide">ชื่อ</dt>
          <dd className="font-semibold text-foreground">{user.name}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="font-mono text-[11px] uppercase tracking-wide">ผู้ใช้</dt>
          <dd className="font-mono text-foreground">@{user.username}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="font-mono text-[11px] uppercase tracking-wide">สิทธิ์</dt>
          <dd>
            <RoleBadge role={user.role} />
          </dd>
        </div>
      </dl>

      <Panel title="เปลี่ยนรหัสผ่าน" className="mt-6">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="current">รหัสผ่านปัจจุบัน</Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="next">รหัสผ่านใหม่</Label>
            <Input
              id="next"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
            <p className="font-body text-xs text-muted-foreground">อย่างน้อย 8 ตัวอักษร</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>

          {error ? <Alert tone="stop">{error}</Alert> : null}
          {done ? <Alert>เปลี่ยนรหัสผ่านแล้ว ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสใหม่</Alert> : null}

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
