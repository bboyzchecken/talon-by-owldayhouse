// Labels, money formatting and printing for the document tool.
import type { DocStatus, DocType, DocumentRow, Money } from "./types";

export const docTypeLabels: Record<DocType, string> = {
  101: "ใบเสนอราคา",
  102: "ใบแจ้งหนี้",
  103: "ใบเสร็จ/ใบกำกับภาษี",
  104: "ใบกำกับภาษี",
  105: "ใบลดหนี้",
  106: "ใบวางบิล",
  107: "ใบเพิ่มหนี้",
  202: "รายจ่าย",
};

export const docStatusLabels: Record<DocStatus, string> = {
  draft: "ร่าง",
  issued: "ออกแล้ว",
  voided: "ยกเลิก",
};

/** Types a sales account may create; the API enforces the same. */
export const salesDocTypes: DocType[] = [101, 102, 106];
/** A receipt/tax invoice (103) is not here: it is issued by recording a payment. */
export const adminDocTypes: DocType[] = [101, 102, 106, 202];
export const payableDocTypes: DocType[] = [101, 102, 106];

export const whtCertLabels: Record<string, string> = {
  none: "ไม่มีหัก ณ ที่จ่าย",
  pending: "รอหนังสือรับรอง 50 ทวิ",
  done: "ได้รับหนังสือรับรองแล้ว",
};

export const vatTypeLabels: Record<number, string> = { 1: "ไม่มี VAT", 2: "VAT 0%", 3: "VAT 7%" };

export const eventLabels: Record<string, string> = {
  created: "สร้างร่าง",
  edited: "แก้ไขร่าง",
  issued: "ออกเลข",
  email_drafted: "ร่างอีเมล",
  sent: "ส่งให้ลูกค้าแล้ว",
  voided: "ยกเลิก",
  payment: "รายการเงิน",
};

/** The templates the print page knows. Other types print in a later step. */
export const printableTypes: DocType[] = [101, 102, 103];

const moneyFormat = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Display only: the API's decimal string as baht with two decimals. */
export function money(value?: Money | number | null): string {
  const n = Number(value ?? 0);
  return moneyFormat.format(Number.isFinite(n) ? n : 0);
}

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** "2026-11-16T00:00:00+07:00" → "2026-11-16" */
export function isoDay(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function ddmmyyyy(value?: string | null): string {
  const day = isoDay(value);
  if (!day) return "";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

// The company as it must appear on a tax invoice: the registered office.
// Kept here, not in the template's sample, because the sample still carries
// an older address.
const issuer = {
  isName: "บริษัท อาวล์ เดย์ เฮ้าส์ จำกัด (สำนักงานใหญ่)",
  isAddr: "ห้อง B1 ชั้น 1 อาคาร TNC เลขที่ 172 ตำบลไชยสถาน อำเภอสารภี จังหวัดเชียงใหม่ 50140",
  isTax: "0505563011424",
  isTel: "0924552450",
  isEmail: "owldayhouse@gmail.com",
  isWeb: "https://www.owldayhouse.com/",
};

interface Buyer {
  name: string;
  contactType: number;
  taxNumber: string;
  branchCode: string;
  address: string;
}

/**
 * Who the document is to. An issued document prints the buyer as recorded at
 * issue (buyer_*), so editing the contact later never changes a tax invoice
 * already given out; a draft prints the contact as it is now.
 */
function buyerOf(doc: DocumentRow): Buyer {
  if (doc.status !== "draft" && doc.buyer_name) {
    return {
      name: doc.buyer_name,
      contactType: doc.buyer_contact_type,
      taxNumber: doc.buyer_tax_number,
      branchCode: doc.buyer_branch_code,
      address: doc.buyer_address,
    };
  }
  const c = doc.contact;
  return {
    name: c?.name ?? "",
    contactType: c?.contact_type ?? 2,
    taxNumber: c?.tax_number ?? "",
    branchCode: c?.branch_code ?? "",
    address: c ? [c.address, c.sub_district, c.district, c.province, c.post_code].filter(Boolean).join(" ") : "",
  };
}

function buyerLabel(b: Buyer): string {
  if (!b.name || b.contactType === 5) return b.name;
  return b.branchCode && b.branchCode !== "00000" ? `${b.name} (สาขา ${b.branchCode})` : `${b.name} (สำนักงานใหญ่)`;
}

/** PEAK's contact types (ContactType), with the label people use. */
export const contactTypeLabels: Record<number, string> = {
  2: "บริษัทจำกัด",
  3: "บริษัทมหาชน",
  1: "ห้างหุ้นส่วนจำกัด",
  8: "ห้างหุ้นส่วนสามัญ",
  4: "ร้านค้า",
  5: "บุคคลธรรมดา",
  6: "คณะบุคคล",
  9: "มูลนิธิ",
  10: "สมาคม",
  11: "กิจการร่วมค้า",
  7: "อื่น ๆ",
};

export const namePrefixLabels: Record<number, string> = { 0: "—", 1: "คุณ", 2: "นาย", 3: "นาง", 4: "นางสาว" };

export const financeSideLabels: Record<string, string> = {
  customer: "ลูกค้า",
  vendor: "ผู้ขาย/ผู้รับจ้าง",
  both: "ทั้งสองฝั่ง",
};

export const paymentMethodTypeLabels: Record<number, string> = { 1: "เงินสด", 2: "บัญชีธนาคาร", 4: "e-Wallet" };

/** PND3 for people and non-juristic groups, PND53 for juristic persons; the API uses the same default. */
export function defaultWhtForm(contactType: number): "pnd3" | "pnd53" {
  return [4, 5, 6, 8].includes(contactType) ? "pnd3" : "pnd53";
}

const printKind: Partial<Record<DocType, string>> = { 101: "quotation", 102: "invoice", 103: "receipt" };

/**
 * Hand a document to the owl-docs print page (public/print/owl-docs.html):
 * written into localStorage under its id, then the page is opened. The page
 * prints the totals stored by the API and never recomputes them; line and
 * document discounts become their own lines so the printed lines add up.
 */
export function openPrint(doc: DocumentRow): void {
  const items: Array<Record<string, unknown>> = [];
  for (const item of doc.items ?? []) {
    if (item.is_description) {
      items.push({ desc: item.description, descOnly: true, qty: 0, price: 0, unit: "" });
      continue;
    }
    items.push({
      desc: item.description,
      qty: Number(item.quantity),
      unit: item.unit_name,
      price: Number(item.price),
    });
    const gross = Number(item.quantity) * Number(item.price);
    const lineDiscount = Math.round((gross - Number(item.line_amount ?? gross)) * 100) / 100;
    if (lineDiscount > 0) {
      items.push({ desc: `ส่วนลด ${item.discount}`, qty: 1, unit: "", price: -lineDiscount });
    }
  }
  if (Number(doc.discount_total) > 0) {
    items.push({ desc: "ส่วนลดท้ายบิล", qty: 1, unit: "", price: -Number(doc.discount_total) });
  }

  const allNoVat = (doc.items ?? []).every((i) => i.is_description || i.vat_type === 1);
  const copy =
    doc.status === "draft" ? "ร่าง — ยังไม่ออกเลข" : doc.status === "voided" ? "ยกเลิกแล้ว / voided" : "ต้นฉบับ / original";
  const person = [doc.contact?.person_first_name, doc.contact?.person_last_name].filter(Boolean).join(" ");
  const buyer = buyerOf(doc);
  const withholding = Number(doc.withholding_total);

  const data = {
    ...issuer,
    docType: printKind[doc.doc_type] ?? "quotation",
    copy,
    asPerson: false,
    cuName: buyerLabel(buyer),
    cuAddr: buyer.address,
    cuTax: buyer.taxNumber || "-",
    cuEmail: doc.contact?.person_email || "-",
    cuAttn: person || "-",
    cuTel: doc.contact?.person_phone || "-",
    mNo: doc.code || "ร่าง",
    mDate: ddmmyyyy(doc.issued_date),
    mValid: ddmmyyyy(doc.due_date),
    mDue: ddmmyyyy(doc.due_date),
    mRef: doc.reference || "-",
    showUnit: (doc.items ?? []).some((i) => i.unit_name),
    vatMode: allNoVat ? "none" : doc.tax_status === 1 ? "incl" : "ex",
    vatRate: 7,
    showWht: withholding > 0,
    remarks: doc.remark,
    payStyle: "none",
    paid: doc.doc_type === 103 && doc.status === "issued",
    sgStampDate: doc.status === "issued" ? ddmmyyyy(doc.issued_date) : "",
    sgRightDate: "",
    hideLogo: false,
    logoUrl: "",
    items,
  };
  const net = Number(doc.net_amount);
  const totals = {
    pretax: Number(doc.pre_tax_amount),
    vat: Number(doc.vat_amount),
    grand: net,
    wht: withholding,
    net: Math.round((net - withholding) * 100) / 100,
  };
  try {
    window.localStorage.setItem(`odh-print:${doc.id}`, JSON.stringify({ data, totals }));
  } catch {
    // Storage blocked: the print page will open on its own blank form.
  }
  window.open(`/print/owl-docs.html?doc=${doc.id}`, "_blank", "noopener");
}
