"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, OwlMark } from "@odh/ui";
import template from "@/lib/owl-docs/template.html";

// Hidden internal tool: Owl Day House document generator (quotation / invoice /
// receipt). Not linked anywhere, excluded from the sitemap + noindex, and gated
// behind a password.
//
// NOTE: this is a 100% static site — there is no backend, so this gate is
// client-side obfuscation, not real authentication. It keeps the tool out of
// casual reach (no plain URL, not indexed) but a determined visitor can read
// the bundle. For real protection, put host-level Basic Auth / Cloudflare
// Access in front of the /owl-docs/ path.

// SHA-256 of the passphrase (never store the plaintext in the bundle).
const PASS_HASH = "ca8690b8da1bb5923ab9b75e23d21fe0198331d9e2f85570fea9cab70ce44889";
const UNLOCK_KEY = "owl-docs-unlocked";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function OwlDocsApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore unlock within the same tab session; focus the field otherwise.
  useEffect(() => {
    if (sessionStorage.getItem(UNLOCK_KEY) === "1") {
      setUnlocked(true);
    } else {
      inputRef.current?.focus();
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const ok = (await sha256Hex(value)) === PASS_HASH;
    setChecking(false);
    if (ok) {
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setValue("");
      inputRef.current?.focus();
    }
  }

  // Full-screen overlay sits above the marketing Nav/Footer from the root layout.
  if (unlocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#eceaf2]">
        <iframe
          title="Owl Day House · เครื่องสร้างเอกสาร"
          srcDoc={template}
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-deep px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-paper p-8 shadow-glow"
        aria-label="เข้าสู่เครื่องมือภายใน"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <OwlMark className="h-12 w-12 text-gold" />
          <div>
            <h1 className="font-display text-lg font-semibold text-navy">เครื่องมือภายใน</h1>
            <p className="mt-1 text-sm text-muted">Owl Day House · เครื่องสร้างเอกสาร</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">รหัสผ่าน</span>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            autoComplete="off"
            className="w-full rounded-lg border border-line bg-white px-3 py-2 font-body text-navy outline-none focus:border-gold"
          />
        </label>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            รหัสผ่านไม่ถูกต้อง
          </p>
        )}

        <Button type="submit" variant="gold" className="mt-5 w-full" disabled={checking || !value}>
          {checking ? "กำลังตรวจสอบ…" : "เข้าสู่ระบบ"}
        </Button>
      </form>
    </div>
  );
}
