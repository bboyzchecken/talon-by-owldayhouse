// Types mirroring the Go API's JSON (snake_case, as PROJECT_TEMPLATE.md sets out).

export type Role = "admin" | "sales";
export type AccountStatus = "active" | "deactivated";
export type OwnerType = "company" | "sales_existing";
export type Industry = "education" | "property_auto" | "healthcare" | "other";
export type Stage = "new" | "contacted" | "meeting" | "proposal" | "won" | "lost" | "nurture" | "declined";
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

export type CalendarKind = "egp_deadline" | "meeting" | "follow_up" | "tax_deadline";

/** One dated item on the team calendar. */
export interface CalendarEvent {
  kind: CalendarKind;
  /** Bangkok day, YYYY-MM-DD. */
  date: string;
  /** HH:MM, meetings only. */
  time?: string;
  title: string;
  detail?: string;
  lead_id: number;
  lead_name: string;
  owner_id?: number;
  owner_name?: string;
  project_id?: string;
  /** Where a non-lead event opens (a tax month). */
  link?: string;
}

export interface CalendarResponse {
  from: string;
  to: string;
  data: CalendarEvent[];
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

export type EgpView = "inbox" | "shortlist" | "flagged" | "excluded" | "closed" | "sent" | "skipped";

export type EgpStage = "upcoming" | "open" | "awarded" | "cancelled" | "unknown";

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
  /** The part of the title that names what is hired; keywords match only here. */
  subject: string;
  stage: EgpStage;
  stage_label: string;
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
  reference_price: number;
  project_status: string;
  province: string;
  announced_at?: string;
  winner_announced_at?: string;
  deadline_at?: string;
  decision: "new" | "sent" | "skipped";
  lead_id?: number;
  /** Starred for analysis; independent of the tab. */
  shortlisted_at?: string;
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
  version?: number;
  /** About the company; heads every export for Claude. */
  analysis_context: string;
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
  /** The file hit e-GP's 1,000-row export cap, so later rows may be missing. */
  maybe_truncated: boolean;
}

export interface EgpBrief {
  filename: string;
  count: number;
  markdown: string;
}

export interface EgpSendResult {
  action: "created" | "attached";
  lead_id: number;
  owner_name: string;
}

// --- Inbox: requests from the quote form on owldayhouse.com -----------------

export type InboundStatus = "new" | "accepted" | "discarded";
export type Timeline = "asap" | "1_3_months" | "3_6_months" | "planning";
export type BudgetBand = "under_100k" | "100k_300k" | "300k_1m" | "over_1m" | "unsure";

export interface InboundRequest {
  id: number;
  created_at: string;
  updated_at: string;
  kind: string;
  status: InboundStatus;
  locale: "th" | "en";
  contact_name: string;
  company: string;
  industry: Industry | "";
  phone: string;
  line_id: string;
  email: string;
  interests: Interest[] | null;
  brief: string;
  timeline: Timeline | "";
  budget_band: BudgetBand | "";
  utm_source: string;
  utm_campaign: string;
  referrer: string;
  landing_path: string;
  lead_id?: number;
  lead?: Lead;
  handled_by?: number;
  handler?: User;
  handled_at?: string;
  discard_reason: string;
}

export interface InboxListResponse {
  items: InboundRequest[];
  total: number;
  counts: Partial<Record<InboundStatus, number>>;
}

// --- Documents (quotations, invoices, receipts …) -----------------------------

/** PEAK's TransactionType numbers. */
export type DocType = 101 | 102 | 103 | 104 | 105 | 106 | 107 | 202;
export type DocStatus = "draft" | "issued" | "voided";

/** Money arrives as a decimal string ("21400", "0.35"): never a float. */
export type Money = string;

export type FinanceSide = "customer" | "vendor" | "both";

export interface BillingContact {
  id: number;
  code: string;
  name: string;
  contact_type: number;
  name_prefix: number;
  finance_side: FinanceSide;
  wht_form: "pnd3" | "pnd53";
  tax_number: string;
  branch_code: string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  post_code: string;
  country: string;
  person_first_name: string;
  person_last_name: string;
  person_position: string;
  person_phone: string;
  person_email: string;
  lead_id?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  product_type: number;
  unit_name: string;
  sell_price: Money;
  sell_vat_type: number;
  interest: string;
  active: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  method_type: number;
  bank_name: string;
  account_no: string;
  active: boolean;
}

export interface DocumentItem {
  id?: number;
  position?: number;
  product_id?: number;
  description: string;
  is_description: boolean;
  quantity: Money;
  unit_name: string;
  price: Money;
  discount: string;
  vat_type: number;
  withholding_rate: Money;
  line_amount?: Money;
  withholding_amount?: Money;
}

export interface DocumentRow {
  id: number;
  doc_type: DocType;
  code: string;
  status: DocStatus;
  contact_id: number;
  contact?: BillingContact;
  lead_id?: number;
  /** The buyer as at issue; empty on a draft. Printed instead of the contact. */
  buyer_name: string;
  buyer_contact_type: number;
  buyer_tax_number: string;
  buyer_branch_code: string;
  buyer_address: string;
  issued_date: string;
  due_date?: string;
  reference: string;
  remark: string;
  tax_status: number;
  is_tax_invoice: boolean;
  discount_total: Money;
  pre_tax_amount: Money;
  vat_amount: Money;
  net_amount: Money;
  withholding_total: Money;
  source_document_id?: number;
  source_document?: DocumentRow;
  received_tax_invoice_number: string;
  received_tax_invoice_date?: string;
  input_vat_period?: string;
  issued_at?: string;
  voided_at?: string;
  void_reason: string;
  items?: DocumentItem[];
  created_at: string;
}

export interface DocumentEvent {
  id: number;
  action: string;
  note: string;
  user?: User;
  created_at: string;
}

export type WhtCertStatus = "none" | "pending" | "done";

// --- Finance overview -------------------------------------------------------------

export interface MonthTotals {
  month: string;
  revenue: string;
  expense: string;
  cash_in: string;
  cash_out: string;
}

export interface CountSum {
  count: number;
  amount: string;
}

export interface OpenItem {
  id: number;
  doc_type: DocType;
  code: string;
  contact_id: number;
  contact_name: string;
  lead_id?: number;
  issued_date: string;
  due_date?: string;
  net_amount: string;
  settled: string;
  outstanding: string;
  days_late: number;
}

export interface AgingBucket {
  key: "current" | "d1_30" | "d31_60" | "d61_90" | "d90";
  label: string;
  count: number;
  amount: string;
}

export interface Aging {
  total: string;
  count: number;
  overdue: CountSum;
  buckets: AgingBucket[];
  items: OpenItem[];
}

export interface AmountRow {
  key: string;
  id?: number;
  name: string;
  amount: string;
  cost: string;
}

export interface FinanceOverview {
  month: string;
  as_of: string;
  series: MonthTotals[];
  this_month: MonthTotals;
  last_month: MonthTotals;
  ytd: MonthTotals;
  last_ytd: MonthTotals;
  receivables: Aging;
  payables: Aging;
  services: AmountRow[];
  customers: AmountRow[];
  jobs: AmountRow[];
  methods: { id: number; name: string; in: string; out: string }[];
  tax: TaxFormView[];
  follow_up: {
    overdue_invoices: CountSum;
    wht_to_receive: CountSum;
    wht_to_send: CountSum;
    no_tax_invoice: CountSum;
    tax_due: TaxDue[];
  };
}

// --- Monthly tax ----------------------------------------------------------------

export type TaxForm = "pp30" | "pnd3" | "pnd53";

export interface TaxFigures {
  output_vat: string;
  input_vat: string;
  credit_brought_forward: string;
  tax_amount: string;
  credit_carried: string;
  line_count: number;
}

export interface TaxFiling extends TaxFigures {
  id: number;
  form: TaxForm;
  period: string;
  status: "open" | "filed";
  paid_amount: string;
  paid_date?: string;
  reference: string;
  note: string;
  filed_by?: number;
  filer?: User;
  filed_at?: string;
}

export interface TaxLine {
  kind: "output" | "credit_note" | "debit_note" | "input" | "withheld";
  document_id: number;
  code: string;
  date: string;
  name: string;
  tax_number: string;
  branch_code: string;
  invoice_no?: string;
  base: string;
  amount: string;
  payment_id?: number;
  wht_cert_done?: boolean;
}

export interface TaxFormView {
  form: TaxForm;
  label: string;
  period: string;
  due_date: string;
  efiling_due_date: string;
  required: boolean;
  before_first: boolean;
  closed: boolean;
  figures: TaxFigures;
  filing: TaxFiling | null;
  differs: boolean;
  lines: TaxLine[];
  events: DocumentEvent[];
}

export interface TaxSettings {
  first_period: string;
  opening_vat_credit: string;
  efiling_extra_days: number;
}

export interface TaxMonth {
  month: string;
  first_period: string;
  settings: TaxSettings;
  forms: TaxFormView[];
}

export interface TaxDue {
  form: TaxForm;
  label: string;
  period: string;
  due_date: string;
  efiling_due_date: string;
  days_left: number;
  filed: boolean;
  tax_amount: string;
  credit_carried: string;
}

export interface Payment {
  id: number;
  document_id: number;
  document?: DocumentRow;
  direction: "in" | "out";
  status: "active" | "voided";
  payment_date: string;
  payment_method_id: number;
  payment_method?: PaymentMethod;
  received_amount: Money;
  withholding_amount: Money;
  settled_amount: Money;
  note: string;
  /** pnd3 / pnd53 when we withheld paying a vendor; empty for money in. */
  wht_form: "" | "pnd3" | "pnd53";
  receipt_id?: number;
  receipt?: DocumentRow;
  wht_cert_status: WhtCertStatus;
  wht_cert_at?: string;
  void_reason: string;
  voided_at?: string;
  creator?: User;
  created_at: string;
}

export interface DocumentPayments {
  items: Payment[];
  settled: Money;
  outstanding: Money;
}

export interface DocumentDetail {
  document: DocumentRow;
  events: DocumentEvent[];
  next: DocType[] | null;
  /** Only on documents money is received against (quotation, invoice, billing note). */
  payments: DocumentPayments | null;
}

export interface DocumentTotals {
  lines: { line_amount: Money; withholding_amount: Money }[];
  subtotal: Money;
  discount_total: Money;
  pre_tax_amount: Money;
  vat_amount: Money;
  net_amount: Money;
  withholding_total: Money;
  payable_amount: Money;
}
