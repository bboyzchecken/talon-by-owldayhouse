// The API surface of the internal tools, typed. Uses the shared axios instance
// from @odh/query, which attaches the bearer token from localStorage.
import { api } from "@odh/query";
import type {
  Activity,
  EgpImportResult,
  EgpListResponse,
  EgpSendResult,
  EgpSettings,
  EgpBrief,
  EgpSettingsResponse,
  EgpView,
  CheckNameResponse,
  Contact,
  Deal,
  DuplicateLead,
  FileRow,
  ImportResponse,
  KPIResult,
  Lead,
  ListResponse,
  Meta,
  OwnershipLog,
  Setting,
  SimilarLead,
  Stage,
  Target,
  TodayResponse,
  User,
} from "./types";

/** The error shape every endpoint returns: {"error": "..."} plus extras. */
export interface ApiErrorBody {
  error?: string;
  fields?: Record<string, string>;
  duplicate?: DuplicateLead;
  similar?: SimilarLead[];
  needs_confirm?: boolean;
  matched_on?: string;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error ?? "เกิดข้อผิดพลาด");
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface AxiosLikeError {
  response?: { status: number; data?: ApiErrorBody };
  message?: string;
}

/** Turn an axios rejection into an ApiError so callers can read `.body`. */
export function toApiError(error: unknown): ApiError {
  const candidate = error as AxiosLikeError;
  if (candidate?.response) {
    return new ApiError(candidate.response.status, candidate.response.data ?? {});
  }
  return new ApiError(0, { error: candidate?.message ?? "ติดต่อเซิร์ฟเวอร์ไม่ได้" });
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const response = await api.get<T>(url, { params });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * POST a file. The shared axios client defaults to JSON, and axios turns a
 * FormData into a JSON string whenever the content type says JSON, so the
 * file would never arrive. Saying multipart keeps it as FormData; the browser
 * then sets the real Content-Type, boundary included.
 */
async function postForm<T>(url: string, body: FormData): Promise<T> {
  try {
    const response = await api.post<T>(url, body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

async function send<T>(
  method: "post" | "patch" | "put" | "delete",
  url: string,
  data?: unknown,
): Promise<T> {
  try {
    const response = await api.request<T>({ method, url, data });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

// --- auth and accounts ------------------------------------------------------

export interface LoginResult {
  token: string;
  expires_at: string;
  user: User;
}

export const auth = {
  login: (username: string, password: string) =>
    send<LoginResult>("post", "/auth/login", { username, password }),
  me: () => get<User>("/api/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    send<{ status: string }>("patch", "/api/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

export const meta = {
  get: () => get<Meta>("/api/meta"),
};

export interface CreateUserResult {
  user: User;
  password?: string;
  note?: string;
}

export const admin = {
  listUsers: () => get<ListResponse<User>>("/api/admin/users", { limit: 100 }),
  createUser: (body: { username: string; name: string; role: string; password?: string }) =>
    send<CreateUserResult>("post", "/api/admin/users", body),
  updateUser: (id: number, body: { name?: string; role?: string; status?: string }) =>
    send<User>("patch", `/api/admin/users/${id}`, body),
  resetPassword: (id: number, password?: string) =>
    send<CreateUserResult>("post", `/api/admin/users/${id}/password`, { password: password ?? "" }),
  listSettings: () => get<{ data: Setting[] }>("/api/admin/settings"),
  setCutoff: (value: string) =>
    send<Setting>("put", "/api/admin/settings/sales_existing_cutoff", { value }),
  recentOwnershipLogs: (limit = 100) =>
    get<{ data: OwnershipLog[] }>("/api/leads/ownership-logs", { limit }),
};

// --- leads ------------------------------------------------------------------

export interface LeadListFilters {
  page?: number;
  limit?: number;
  owner_user_id?: number;
  owner_type?: string;
  stage?: string;
  industry?: string;
  source?: string;
  search?: string;
  due_today?: boolean;
  do_not_pitch?: boolean;
  mine?: boolean;
  sort?: string;
}

export interface CreateLeadBody {
  name: string;
  tax_id?: string;
  website?: string;
  industry: string;
  source: string;
  source_detail?: string;
  utm_source?: string;
  utm_campaign?: string;
  owner_type?: string;
  owner_user_id?: number;
  interests?: string[];
  estimated_value?: number;
  next_action?: string;
  next_action_date?: string;
  notes?: string;
  do_not_pitch?: boolean;
  do_not_pitch_reason?: string;
  confirm_similar?: boolean;
  contact?: {
    name: string;
    position?: string;
    phone?: string;
    line_id?: string;
    email?: string;
    note?: string;
  };
}

/** Only the fields a PATCH may change — ownership is not one of them. */
export type UpdateLeadBody = Partial<Omit<CreateLeadBody, "contact" | "owner_type" | "owner_user_id">>;

export const leads = {
  list: (filters: LeadListFilters) =>
    get<ListResponse<Lead>>("/api/leads", {
      ...filters,
      due_today: filters.due_today ? 1 : undefined,
      do_not_pitch: filters.do_not_pitch ? 1 : undefined,
      mine: filters.mine ? 1 : undefined,
    }),
  get: (id: number) => get<{ lead: Lead; can_edit: boolean }>(`/api/leads/${id}`),
  check: (name: string, taxId?: string) =>
    get<CheckNameResponse>("/api/leads/check", { name, tax_id: taxId || undefined }),
  create: (body: CreateLeadBody) => send<Lead>("post", "/api/leads", body),
  update: (id: number, body: UpdateLeadBody) => send<Lead>("patch", `/api/leads/${id}`, body),
  changeStage: (
    id: number,
    body: { stage: Stage; lost_reason?: string; deal?: { service: string; amount: number; won_at?: string } },
  ) => send<Lead>("post", `/api/leads/${id}/stage`, body),
  assign: (id: number, body: { owner_type: string; owner_user_id?: number; note?: string }) =>
    send<Lead>("post", `/api/leads/${id}/assign`, body),
  today: (userId?: number) => get<TodayResponse>("/api/leads/today", { user_id: userId }),
  stageCounts: (params: { user_id?: number; mine?: boolean }) =>
    get<{ stages: Stage[]; counts: Record<string, number> }>("/api/leads/stages", {
      user_id: params.user_id,
      mine: params.mine ? 1 : undefined,
    }),
  ownershipLogs: (id: number) => get<{ data: OwnershipLog[] }>(`/api/leads/${id}/ownership-logs`),

  contacts: {
    list: (leadId: number) => get<{ data: Contact[] }>(`/api/leads/${leadId}/contacts`),
    create: (leadId: number, body: Partial<Contact> & { name: string }) =>
      send<Contact>("post", `/api/leads/${leadId}/contacts`, body),
    update: (leadId: number, contactId: number, body: Partial<Contact> & { name: string }) =>
      send<Contact>("patch", `/api/leads/${leadId}/contacts/${contactId}`, body),
    remove: (leadId: number, contactId: number) =>
      send<{ status: string }>("delete", `/api/leads/${leadId}/contacts/${contactId}`),
  },

  activities: {
    list: (leadId: number) => get<{ data: Activity[] }>(`/api/leads/${leadId}/activities`),
    create: (
      leadId: number,
      body: { type: string; happened_at?: string; summary?: string; next_action?: string; next_action_date?: string },
    ) => send<Activity>("post", `/api/leads/${leadId}/activities`, body),
    remove: (leadId: number, activityId: number) =>
      send<{ status: string }>("delete", `/api/leads/${leadId}/activities/${activityId}`),
  },

  deals: {
    list: (leadId: number) => get<{ data: Deal[] }>(`/api/leads/${leadId}/deals`),
  },

  files: {
    list: (leadId: number) => get<{ data: FileRow[] }>(`/api/leads/${leadId}/files`),
  },
};

// --- KPI and targets --------------------------------------------------------

export const kpi = {
  get: (params: { year?: number; quarter?: number; month?: number; user_id?: number }) =>
    get<KPIResult>("/api/leads/kpi", params),
  targets: (params: { year?: number; quarter?: number }) =>
    get<{ data: Target[]; year: number; quarter: number; defaults: Record<string, number> }>(
      "/api/leads/targets",
      params,
    ),
  saveTarget: (body: {
    user_id: number;
    year: number;
    quarter: number;
    revenue_target: number;
    proposals_target: number;
    meetings_target: number;
  }) => send<Target>("put", "/api/leads/targets", body),
};

// --- files (shared by every tool) -------------------------------------------

interface UploadURLResponse {
  file: FileRow;
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  content_type: string;
}

export const files = {
  /**
   * Upload straight to Cloudflare R2: ask the API for a presigned PUT, send the
   * bytes to R2, then confirm so the API can read the real size back. The bytes
   * never pass through our server.
   */
  upload: async (ownerType: string, ownerId: number, file: File): Promise<FileRow> => {
    const presigned = await send<UploadURLResponse>("post", "/api/files/upload-url", {
      owner_type: ownerType,
      owner_id: ownerId,
      filename: file.name,
      size: file.size,
    });

    // A bucket without a CORS policy makes the browser block this request
    // outright: fetch() rejects with a network error instead of returning a
    // status, so both paths need the same clear message.
    const r2Failed = "อัปโหลดไฟล์ไป R2 ไม่สำเร็จ — แจ้งแอดมินให้ตรวจการตั้งค่า CORS ของ bucket";
    let put: Response;
    try {
      put = await fetch(presigned.upload_url, {
        method: presigned.method ?? "PUT",
        headers: presigned.headers,
        body: file,
      });
    } catch {
      throw new ApiError(0, { error: r2Failed });
    }
    if (!put.ok) {
      throw new ApiError(put.status, { error: r2Failed });
    }

    return send<FileRow>("post", `/api/files/${presigned.file.id}/confirm`);
  },

  downloadURL: (id: number, inline = false) =>
    get<{ download_url: string; expires_at: string; filename: string }>(
      `/api/files/${id}/download-url`,
      inline ? { inline: 1 } : undefined,
    ),

  remove: (id: number) => send<{ status: string }>("delete", `/api/files/${id}`),
};

// --- CSV import and export --------------------------------------------------

export const csv = {
  /** Two-pass import: preview first, then commit. */
  import: async (
    form: {
      file: File;
      mode: "preview" | "commit";
      source?: string;
      source_detail?: string;
      owner_type?: string;
      owner_user_id?: number;
      confirm_similar?: boolean;
    },
  ): Promise<ImportResponse> => {
    const body = new FormData();
    body.append("file", form.file);
    body.append("mode", form.mode);
    if (form.source) body.append("source", form.source);
    if (form.source_detail) body.append("source_detail", form.source_detail);
    if (form.owner_type) body.append("owner_type", form.owner_type);
    if (form.owner_user_id) body.append("owner_user_id", String(form.owner_user_id));
    if (form.confirm_similar) body.append("confirm_similar", "1");

    return postForm<ImportResponse>("/api/leads/import", body);
  },

  /** Download the admin CSV export through the authenticated axios instance. */
  exportLeads: async (filters: LeadListFilters): Promise<void> => {
    try {
      const response = await api.get<Blob>("/api/leads/export", {
        params: filters,
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `odh-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw toApiError(error);
    }
  },
};

// --- e-GP Radar (admin only) -------------------------------------------------

export const egp = {
  list: (view: EgpView) => get<EgpListResponse>("/api/egp/announcements", { view }),

  /** The file from e-GP's own "Export .CSV" button. */
  importCSV: async (file: File): Promise<EgpImportResult> => {
    const body = new FormData();
    body.append("file", file);
    return postForm<EgpImportResult>("/api/egp/import", body);
  },

  setDeadline: (id: number, deadline: string) =>
    send<unknown>("patch", `/api/egp/announcements/${id}`, { deadline_at: deadline }),

  send: (id: number, body: { owner_user_id?: number; lead_id?: number; confirm_similar?: boolean }) =>
    send<EgpSendResult>("post", `/api/egp/announcements/${id}/send`, body),

  skip: (id: number) => send<unknown>("post", `/api/egp/announcements/${id}/skip`),
  restore: (id: number) => send<unknown>("post", `/api/egp/announcements/${id}/restore`),
  shortlist: (id: number, on: boolean) => send<unknown>("post", `/api/egp/announcements/${id}/shortlist`, { on }),

  /** The starred projects as one Markdown brief to hand to Claude. */
  brief: () => get<EgpBrief>("/api/egp/export"),

  settings: () => get<EgpSettingsResponse>("/api/egp/settings"),
  saveSettings: (settings: EgpSettings) =>
    send<{ settings: EgpSettings }>("put", "/api/egp/settings", settings),
};
