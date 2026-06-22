# @odh/query

Shared data-fetching layer for the **Talon admin dashboard** (and anything that
talks to the ODH Go API). Built on **axios** + **TanStack Query**.

> The static marketing site (`apps/web` / owldayhouse.com) does **not** use this —
> it has no backend. This package is for the dashboard app + Go API (Step 8).

## Setup (in a dashboard app)

```tsx
// app/layout.tsx
import { QueryProvider } from "@odh/query";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

Set the API base URL via env: `NEXT_PUBLIC_API_URL=https://api.owldayhouse.com`
(defaults to `http://localhost:5000`).

## Usage

```tsx
"use client";
import { useApiQuery, useApiMutation } from "@odh/query";

interface Lead {
  id: number;
  name: string;
  status: string;
}

function Leads() {
  const { data, isLoading } = useApiQuery<Lead[]>(["leads"], "/api/leads");
  const updateStatus = useApiMutation<Lead, { id: number; status: string }>(
    "/api/leads/status",
    "patch",
  );

  if (isLoading) return <p>กำลังโหลด…</p>;
  return <button onClick={() => updateStatus.mutate({ id: 1, status: "won" })}>…</button>;
}
```

## Exports

| Export                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `api`                        | Configured axios instance (base URL + auth header).  |
| `setAuthToken(token)`        | Store / clear the bearer token (localStorage).       |
| `QueryProvider`              | Client provider — wrap the dashboard root layout.    |
| `createQueryClient()`        | QueryClient factory (sensible defaults).             |
| `useApiQuery(key, url, ...)` | Typed GET hook (axios + caching).                    |
| `useApiMutation(url, method)`| Typed POST/PUT/PATCH/DELETE hook.                    |
| `useQueryClient`, `useInfiniteQuery` | Re-exported TanStack primitives.             |
