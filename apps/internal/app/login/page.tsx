"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, OwlLogo } from "@odh/ui";
import { Alert, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
      router.replace("/");
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.body?.error ?? "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <OwlLogo className="h-9 w-auto" />
          <h1 className="font-display text-xl font-semibold text-ink">เครื่องมือภายใน</h1>
          <p className="font-body text-sm text-muted">
            สำหรับทีมงาน Owl Day House เท่านั้น บัญชีสร้างโดยแอดมิน
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error ? <Alert>{error}</Alert> : null}

          <Field label="ชื่อผู้ใช้" required>
            <Input
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
              disabled={submitting}
            />
          </Field>

          <Field label="รหัสผ่าน" required>
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-muted">
          ลืมรหัสผ่าน? ให้แอดมินรีเซ็ตให้ — ระบบนี้ไม่มีการส่งอีเมล
        </p>
      </div>
    </div>
  );
}
