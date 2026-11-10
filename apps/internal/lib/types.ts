// Types mirroring the Go API's JSON (snake_case, as PROJECT_TEMPLATE.md sets out).

export type Role = "admin" | "sales";
export type AccountStatus = "active" | "deactivated";
export type OwnerType = "company" | "sales_existing";
export type Industry = "education" | "property_auto" | "healthcare" | "other";
export type Stage = "new" | "contacted" | "meeting" | "proposal" | "won" | "lost" | "nurture";
export type ActivityType = "call" | "line" | "meeting" | "proposal_sent" | "note";
export type Source =
  | "trade_fair"
  | "egp"
  | "ad_library"
  | "social_listening"
  | "agency"
  | "referral"
  | "website"
  | "linkedin"
  | "sales_existing";
export type Interest =
  | "lead_kit"
  | "kol"
  | "event"
  | "system"
  | "digital_marketing"
  | "social_listening";

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string;
  position: string;
  phone: string;
  line_id: string;
  email: string;
  note: string;
}

export interface Lead {
  id: number;
  name: string;
  normalized_name: string;
  tax_id?: string;
  website: string;
  industry: Industry;
  source: Source;
  source_detail: string;
  utm_source: string;
  utm_campaign: string;
  owner_type: OwnerType;
  owner_user_id?: number;
  owner?: User;
  registered_by: number;
  registrar?: User;
  registered_at: string;
  stage: Stage;
  lost_reason: string;
  interests: Interest[] | null;
  estimated_value: number;
  next_action: string;
  next_action_date?: string;
  notes: string;
  do_not_pitch: boolean;
  do_not_pitch_reason: string;
  contacts?: Contact[];
  updated_at: string;
}

export interface Activity {
  id: number;
  lead_id: number;
  user_id: number;
  user?: User;
  lead?: Lead;
  type: ActivityType;
  happened_at: string;
  summary: string;
}

export interface Deal {
  id: number;
  lead_id: number;
  service: string;
  amount: number;
  won_at: string;
}

export interface Target {
  id: number;
  user_id: number;
  user?: User;
  year: number;
  quarter: number;
  revenue_target: number;
  proposals_target: number;
  meetings_target: number;
}

export interface OwnershipLog {
  id: number;
  lead_id: number;
  lead?: Lead;
  changed_by: number;
  changed_by_user?: User;
  from_owner_type: string;
  to_owner_type: string;
  from_owner_user_id?: number;
  to_owner_user_id?: number;
  note: string;
  created_at: string;
}

export interface FileRow {
  id: number;
  owner_type: string;
  owner_id: number;
  key: string;
  filename: string;
  mime: string;
  size: number;
  status: "pending" | "ready";
  uploaded_by: number;
  uploader?: User;
  created_at: string;
}

export interface Pagination {
  total: number;
  total_pages: number;
  current_page: number;
  limit: number;
}

export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface SimilarLead {
  id: number;
  name: string;
  owner_type: OwnerType;
  owner_user_id?: number;
  owner_name: string;
  registered_at: string;
  similarity: number;
}

export interface DuplicateLead {
  id: number;
  name: string;
  owner_type: OwnerType;
  owner_user_id?: number;
  owner_name: string;
  registered_by: string;
  registered_at: string;
  stage: Stage;
  do_not_pitch: boolean;
}

export interface CheckNameResponse {
  normalized_name: string;
  duplicate: DuplicateLead | null;
  similar: SimilarLead[];
  matched_on?: string;
}

export interface Meta {
  industries: Industry[];
  sources: Source[];
  stages: Stage[];
  interests: Interest[];
  owner_types: OwnerType[];
  activity_types: ActivityType[];
  users: User[];
  sales_existing_cutoff: string;
  similarity_threshold: number;
  upload: { max_bytes: number; extensions: string[] };
  default_targets: {
    revenue_target: number;
    proposals_target: number;
    meetings_target: number;
  };
}

export interface TodayResponse {
  due: Lead[];
  upcoming: Lead[];
  meetings: Activity[];
}

export interface KPISplit {
  new_leads: number;
  meetings: number;
  proposals: number;
  won_count: number;
  won_amount: number;
}

export interface KPITarget {
  revenue_target: number;
  proposals_target: number;
  meetings_target: number;
  revenue_percent: number;
  proposals_percent: number;
  meetings_percent: number;
  bonus_revenue: number;
  bonus_revenue_percent: number;
}

export interface KPIUser {
  user_id: number;
  username: string;
  name: string;
  company: KPISplit;
  sales_existing: KPISplit;
  total: KPISplit;
  target?: KPITarget;
}

export interface KPISourceConversion {
  source: Source;
  new_leads: number;
  meetings: number;
  proposals: number;
  won_count: number;
  won_amount: number;
  meeting_rate: number;
  won_rate: number;
}

export interface KPIResult {
  period: { year: number; quarter: number; month: number; label: string; from: string; to: string };
  users: KPIUser[];
  team: KPIUser;
  by_source: KPISourceConversion[];
}

export interface ImportRow {
  row: number;
  name: string;
  normalized_name: string;
  industry: string;
  source: string;
  source_detail: string;
  website: string;
  contact: string;
  status: "new" | "duplicate" | "duplicate_in_file" | "similar" | "invalid" | "created";
  message?: string;
  duplicate?: DuplicateLead;
  similar?: SimilarLead[];
  lead_id?: number;
}

export interface ImportResponse {
  mode: "preview" | "commit";
  summary: Record<string, number>;
  rows: ImportRow[];
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// --- e-GP Radar ---------------------------------------------------------------

export type EgpView = "inbox" | "flagged" | "excluded" | "sent" | "skipped";

export interface EgpFlag {
  code: string;
  label: string;
  reason: string;
  severity: "warn" | "info";
}

export interface EgpExclusion {
  code: string;
  reason: string;
}

export interface EgpResult {
  group: string;
  group_label: string;
  industry: string;
  passed: boolean;
  exclusions: EgpExclusion[];
  flags: EgpFlag[];
  flagged: boolean;
  score: number;
  matched_services: string[];
  matched_keywords: string[];
  interests: string[];
  watchlisted: boolean;
  days_left: number | null;
}

export interface EgpAnnouncement {
  id: number;
  project_id: string;
  agency: string;
  procurement_unit: string;
  title: string;
  method: string;
  method_label: string;
  hire: boolean;
  budget: number;
  project_status: string;
  province: string;
  announced_at?: string;
  deadline_at?: string;
  decision: "new" | "sent" | "skipped";
  lead_id?: number;
  first_seen_at: string;
  result: EgpResult;
}

export interface EgpListResponse {
  view: EgpView;
  counts: Record<EgpView, number>;
  data: EgpAnnouncement[];
}

export interface EgpServiceGroup {
  key: string;
  label: string;
  enabled: boolean;
  keywords: string[];
  interest: string;
}

export interface EgpSettings {
  agency_groups: string[];
  provinces: string[];
  watchlist: string[];
  blocklist: string[];
  budget_min: number;
  budget_max: number;
  service_groups: EgpServiceGroup[];
  exclude_keywords: string[];
  hire_only: boolean;
  min_prep_days: number;
  hide_flagged_by_default: boolean;
  default_assignee_id: number | null;
  lead_time_days: number;
}

export interface EgpSettingsResponse {
  settings: EgpSettings;
  defaults: EgpSettings;
  groups: { key: string; label: string }[];
}

export interface EgpImportResult {
  created: number;
  updated: number;
  problems: { line: number; reason: string }[];
}

export interface EgpSendResult {
  action: "created" | "attached";
  lead_id: number;
  owner_name: string;
}
