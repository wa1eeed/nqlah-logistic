import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';

// Resolve the bundled Arabic font whether running from the app root (dev) or a
// compiled/containerised layout.
const FONT_DIR = [
  path.join(process.cwd(), 'assets', 'fonts'),
  path.join(__dirname, '..', '..', '..', 'assets', 'fonts'),
  path.join(__dirname, '..', '..', '..', '..', 'assets', 'fonts'),
].find((d) => fs.existsSync(path.join(d, 'Amiri-Regular.ttf'))) ??
  path.join(process.cwd(), 'assets', 'fonts');
const FONT = path.join(FONT_DIR, 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'Amiri-Bold.ttf');

// pdfkit (fontkit) shapes + orders Arabic correctly from raw text with the
// `rtla` feature — no manual reshaping/reversal. CRITICAL: an `rtla` run must
// be pure Arabic; any Latin letters or Western digits inside it get reversed,
// so numbers / IDs / Latin are always drawn as separate LTR runs via `en()`.
const RTL = { features: ['rtla'] as string[] };

export interface InvoicePdfData {
  invoiceNumber: string;
  kind: string; // SERVICE | COMMISSION
  createdAt: Date;
  amount: number; // taxable base
  vatAmount: number;
  totalAmount: number;
  sellerName?: string | null;
  sellerVatNumber?: string | null;
  sellerCrNumber?: string | null;
  buyerName?: string | null;
  buyerVatNumber?: string | null;
  buyerCrNumber?: string | null;
  zatcaQr?: string | null;
  orderNumber?: string | null;
}

const NAVY = '#0A2A28';
const MINT = '#00C9A7';
const MINT_SOFT = '#E6FAF5';
const INK = '#13211F';
const GREY = '#6B7280';
const LINE = '#E5E7EB';
const BG = '#F7F9F9';

export async function renderInvoicePdf(inv: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.registerFont('ar', FONT);
  doc.registerFont('arB', FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  const L = doc.page.margins.left;
  const R = doc.page.width - doc.page.margins.right;
  const W = R - L;
  const sar = (n: number) =>
    `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
  const dt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}  ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  // Arabic (RTL) — pure Arabic only.
  const ar = (
    s: string, x: number, y: number, w: number,
    o: { font?: string; size?: number; color?: string; align?: 'right' | 'center' | 'left' } = {},
  ) => doc.font(o.font ?? 'ar').fontSize(o.size ?? 10).fillColor(o.color ?? INK)
    .text(s, x, y, { width: w, align: o.align ?? 'right', ...RTL } as PDFKit.Mixins.TextOptions);
  // LTR — numbers / IDs / Latin.
  const en = (
    s: string, x: number, y: number, w: number,
    o: { font?: string; size?: number; color?: string; align?: 'right' | 'center' | 'left' } = {},
  ) => doc.font(o.font ?? 'ar').fontSize(o.size ?? 10).fillColor(o.color ?? INK)
    .text(s, x, y, { width: w, align: o.align ?? 'left' });

  // ───────────────────────── Header band ─────────────────────────
  const H = 104;
  doc.rect(0, 0, doc.page.width, H).fill(NAVY);
  doc.save();
  doc.translate(L + 8, 36).rotate(45).rect(0, 0, 16, 16).fill(MINT);
  doc.restore();
  ar('نقلة', L + 40, 30, 180, { font: 'arB', size: 24, color: '#FFFFFF', align: 'left' });
  en('NQLAH · Logistics', L + 40, 64, 180, { size: 9, color: '#9FB4B0' });
  ar('فاتورة ضريبية', R - 230, 28, 230, { font: 'arB', size: 22, color: '#FFFFFF' });
  en('TAX INVOICE', R - 230, 58, 230, { size: 10, color: MINT, align: 'right' });
  ar(inv.kind === 'COMMISSION' ? 'فاتورة عمولة' : 'فاتورة خدمة نقل', R - 230, 76, 230, { size: 9, color: '#9FB4B0' });

  // ───────────────────────── Meta strip ─────────────────────────
  let y = H + 18;
  doc.roundedRect(L, y, W, 48, 6).fill(BG);
  const cw = W / 3;
  const metaCell = (labelAr: string, value: string, i: number) => {
    const x = L + i * cw;
    if (i > 0) doc.moveTo(x, y + 9).lineTo(x, y + 39).strokeColor(LINE).lineWidth(1).stroke();
    ar(labelAr, x + 12, y + 9, cw - 24, { size: 8, color: GREY });
    en(value, x + 12, y + 25, cw - 24, { font: 'arB', size: 12, color: NAVY, align: 'right' });
  };
  metaCell('رقم الفاتورة', inv.invoiceNumber, 2);
  metaCell('تاريخ ووقت الإصدار', dt(inv.createdAt), 1);
  metaCell('رقم الطلب', inv.orderNumber ?? '—', 0);
  y += 48 + 18;

  // ───────────────────────── Parties ─────────────────────────
  const gap = 16;
  const cardW = (W - gap) / 2;
  const cardH = 94;
  const partyCard = (titleAr: string, titleEn: string, name: string, vat: string, cr: string, x: number) => {
    doc.roundedRect(x, y, cardW, cardH, 6).lineWidth(1).strokeColor(LINE).stroke();
    doc.rect(x + 1, y + 1, cardW - 2, 24).fill(MINT_SOFT);
    ar(titleAr, x + 12, y + 6, cardW - 24, { font: 'arB', size: 10, color: NAVY });
    en(titleEn, x + 12, y + 8, cardW - 24, { size: 8, color: GREY });
    ar(name || '—', x + 12, y + 32, cardW - 24, { font: 'arB', size: 12, color: INK });
    ar('الرقم الضريبي', x + 12, y + 56, cardW - 24, { size: 8, color: GREY });
    en(vat || '—', x + 12, y + 67, cardW - 24, { size: 9, color: INK, align: 'right' });
    ar('السجل التجاري', x + 12, y + 78, cardW - 24, { size: 8, color: GREY });
    en(cr || '—', x + 12, y + 78, cardW - 24, { size: 9, color: INK, align: 'left' });
  };
  // Party roles: a SERVICE invoice is carrier → client; a COMMISSION invoice is
  // the platform → the bearer.
  const isCommission = inv.kind === 'COMMISSION';
  const sellerAr = isCommission ? 'المنصّة' : 'الناقل';
  const sellerEn = isCommission ? 'PLATFORM' : 'CARRIER';
  const buyerAr = isCommission ? 'المستفيد' : 'العميل';
  const buyerEn = isCommission ? 'BENEFICIARY' : 'CLIENT';
  partyCard(sellerAr, sellerEn, inv.sellerName ?? '', inv.sellerVatNumber ?? '', inv.sellerCrNumber ?? '', L + cardW + gap);
  partyCard(buyerAr, buyerEn, inv.buyerName ?? '', inv.buyerVatNumber ?? '', inv.buyerCrNumber ?? '', L);
  y += cardH + 20;

  // ───────────────────────── Items table ─────────────────────────
  // RTL columns (right → left): الوصف | الكمية | سعر الوحدة | الضريبة | الإجمالي
  const descW = W - (92 + 90 + 90 + 44);
  const cols = [
    { key: 'total', label: 'الإجمالي', w: 92 },
    { key: 'vat', label: 'الضريبة', w: 90 },
    { key: 'unit', label: 'سعر الوحدة', w: 90 },
    { key: 'qty', label: 'الكمية', w: 44 },
    { key: 'desc', label: 'الوصف', w: descW },
  ];
  doc.rect(L, y, W, 26).fill(NAVY);
  let cx = L;
  for (const c of cols) {
    ar(c.label, cx, y + 7, c.w, { font: 'arB', size: 9, color: '#FFFFFF', align: c.key === 'desc' ? 'right' : 'center' });
    cx += c.w;
  }
  y += 26;
  const desc = inv.kind === 'COMMISSION' ? 'عمولة منصة نقلة على الطلب' : 'خدمة نقل وتوصيل شحنة';
  const rowH = 36;
  doc.rect(L, y, W, rowH).fill('#FFFFFF');
  doc.moveTo(L, y + rowH).lineTo(R, y + rowH).strokeColor(LINE).lineWidth(1).stroke();
  cx = L;
  const vals: Record<string, string> = {
    total: sar(inv.totalAmount), vat: sar(inv.vatAmount), unit: sar(inv.amount), qty: '1',
  };
  for (const c of cols) {
    if (c.key === 'desc') {
      ar(desc, cx + 10, y + 7, c.w - 16, { size: 10, color: INK });
      if (inv.orderNumber) en(inv.orderNumber, cx + 10, y + 22, c.w - 16, { size: 8, color: GREY, align: 'right' });
    } else {
      en(vals[c.key], cx, y + 12, c.w, { size: 9, color: INK, align: 'center' });
    }
    cx += c.w;
  }
  y += rowH + 20;

  // ───────────────────────── Totals (left) + ZATCA QR (right) ─────────────────────────
  const blockY = y;
  const boxW = 240;
  const trow = (labelAr: string, rate: string | null, value: string, bold = false, fill?: string) => {
    if (fill) doc.rect(L, y, boxW, 28).fill(fill);
    ar(labelAr, L + 10, y + (bold ? 8 : 6), boxW - 120, { font: bold ? 'arB' : 'ar', size: bold ? 11 : 10, color: bold ? '#FFFFFF' : GREY });
    if (rate) en(rate, L + boxW - 118, y + (bold ? 9 : 7), 36, { size: 8, color: bold ? '#E6FAF5' : GREY, align: 'left' });
    en(value, L + boxW - 110, y + (bold ? 8 : 6), 100, { font: 'arB', size: bold ? 12 : 10, color: bold ? '#FFFFFF' : INK, align: 'right' });
    y += bold ? 28 : 23;
  };
  doc.roundedRect(L, y, boxW, 104, 6).lineWidth(1).strokeColor(LINE).stroke();
  y += 10;
  trow('الإجمالي الخاضع للضريبة', null, sar(inv.amount));
  trow('ضريبة القيمة المضافة', '15%', sar(inv.vatAmount));
  y += 2;
  trow('الإجمالي شامل الضريبة', null, sar(inv.totalAmount), true, MINT);

  if (inv.zatcaQr) {
    const qrSize = 108;
    const qrX = R - qrSize;
    const qr = await QRCode.toBuffer(inv.zatcaQr, { margin: 0, width: qrSize * 2 });
    doc.image(qr, qrX, blockY, { width: qrSize });
    ar('رمز الاستجابة السريعة المعتمد', qrX - 150, blockY + 28, 142, { size: 9, color: INK });
    ar('هيئة الزكاة والضريبة والجمارك', qrX - 150, blockY + 44, 142, { size: 8, color: GREY });
    en('ZATCA e-invoice QR', qrX - 150, blockY + 60, 142, { size: 8, color: GREY, align: 'right' });
  }

  // ───────────────────────── Footer ─────────────────────────
  const fY = doc.page.height - 86;
  doc.moveTo(L, fY).lineTo(R, fY).strokeColor(LINE).lineWidth(1).stroke();
  ar('فاتورة ضريبية مُصدَرة إلكترونياً عبر منصة نقلة وفق متطلبات الفوترة الإلكترونية — المرحلة الأولى',
    L, fY + 10, W, { size: 8, color: GREY, align: 'center' });
  en('Electronically generated · ZATCA Phase-1 compliant tax invoice',
    L, fY + 26, W, { size: 7, color: GREY, align: 'center' });

  doc.end();
  return done;
}
