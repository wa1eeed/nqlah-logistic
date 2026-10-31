import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STORAGE_CONNECTOR, type StorageConnector } from '../../integrations/storage/storage.connector';
import { renderInvoicePdf } from './invoice-pdf';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import type { Prisma } from '../../generated/prisma';
import type { OrderFinancials } from '../../common/pricing/pricing';
import { nextInvoiceNumber, zatcaQrBase64 } from './zatca';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString() orderId!: string;
  @IsString() receiverId!: string;
  @IsNumber() amount!: number;
  @IsOptional() @IsNumber() vatAmount?: number;
  @IsOptional() @IsString() notes?: string;
}

/** Minimal shape `generateForOrder` needs — fetched inside the caller's tx. */
interface InvoiceableOrder {
  id: string;
  orderNumber: string;
  clientId: string;
  carrierId: string | null;
  client: { nameAr: string; vatNumber: string | null; crNumber: string | null };
  carrier: { nameAr: string; vatNumber: string | null; crNumber: string | null; vatRegistered: boolean } | null;
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_CONNECTOR) private storage: StorageConnector,
  ) {}

  // Small in-memory cache so we don't re-fetch the logo on every PDF render.
  private logoCache: { url: string; buf: Buffer | null; at: number } | null = null;

  /** Fetch the configured platform logo bytes for the invoice header. Prefers
   * the dark-mode variant (the header band is navy). Returns null when unset or
   * when the format is one pdfkit can't embed (SVG) → renderer draws the mark. */
  private async platformLogoBytes(): Promise<Buffer | null> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['platform.logoUrlDark', 'platform.logoUrl'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const url = map['platform.logoUrlDark'] || map['platform.logoUrl'] || '';
    if (!url) return null;
    if (this.logoCache && this.logoCache.url === url && Date.now() - this.logoCache.at < 300_000) {
      return this.logoCache.buf;
    }
    try {
      // pdfkit only embeds PNG/JPEG; SVG logos are skipped here (web/app still use them).
      if (/\.svg($|\?)/i.test(url)) throw new Error('svg-unsupported');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`logo fetch ${res.status}`);
      if ((res.headers.get('content-type') ?? '').includes('svg')) throw new Error('svg-unsupported');
      const buf = Buffer.from(await res.arrayBuffer());
      this.logoCache = { url, buf, at: Date.now() };
      return buf;
    } catch {
      this.logoCache = { url, buf: null, at: Date.now() };
      return null;
    }
  }

  /** Render the invoice's ZATCA tax-invoice PDF, store it, and return a
   *  short-lived download URL (the object key is cached on `pdfUrl`). */
  async getPdfUrl(id: string, actor: AuthUser): Promise<{ url: string }> {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: { order: { select: { orderNumber: true, clientId: true, carrierId: true } } },
    });
    if (!inv) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'الفاتورة غير موجودة' });
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
    const cid = actor.companyId;
    if (!isAdmin && inv.issuerId !== cid && inv.receiverId !== cid) {
      throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'الفاتورة غير موجودة' });
    }
    const pdf = await renderInvoicePdf({
      invoiceNumber: inv.invoiceNumber,
      kind: inv.kind,
      createdAt: inv.createdAt,
      amount: Number(inv.amount),
      vatAmount: Number(inv.vatAmount),
      totalAmount: Number(inv.totalAmount),
      sellerName: inv.sellerName,
      sellerVatNumber: inv.sellerVatNumber,
      sellerCrNumber: inv.sellerCrNumber,
      buyerName: inv.buyerName,
      buyerVatNumber: inv.buyerVatNumber,
      buyerCrNumber: inv.buyerCrNumber,
      zatcaQr: inv.zatcaQr,
      orderNumber: inv.order?.orderNumber ?? null,
      logo: await this.platformLogoBytes(),
    });
    const key = `invoices/${inv.invoiceNumber}.pdf`;
    await this.storage.put(key, pdf, pdf.length, 'application/pdf');
    if (inv.pdfUrl !== key) {
      await this.prisma.invoice.update({ where: { id }, data: { pdfUrl: key } });
    }
    const url = await this.storage.presignedGet(key, 60 * 60);
    return { url };
  }

  async list(query: PaginationDto, actor: AuthUser) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = query;
    const where = this.isAdmin(actor)
      ? {}
      : { OR: [{ issuerId: actor.companyId ?? '' }, { receiverId: actor.companyId ?? '' }] };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort]: order },
        include: {
          issuer: { select: { nameAr: true } },
          receiver: { select: { nameAr: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findById(id: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: { issuer: true, receiver: true, order: true },
    });
    if (!inv) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'الفاتورة غير موجودة' });
    return inv;
  }

  async create(dto: CreateInvoiceDto, actor: AuthUser) {
    const vat = dto.vatAmount ?? +(dto.amount * 0.15).toFixed(2);
    const issuerId = actor.companyId!;
    return this.prisma.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(this.prisma),
        kind: 'SERVICE',
        orderId: dto.orderId,
        issuerId,
        receiverId: dto.receiverId,
        amount: dto.amount,
        vatAmount: vat,
        totalAmount: +(dto.amount + vat).toFixed(2),
        notes: dto.notes,
        status: 'ISSUED',
      },
    });
  }

  async send(id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'ISSUED' },
    });
  }

  /**
   * Generate the VAT-compliant tax invoices for a completed order, inside the
   * caller's transaction. Idempotent: does nothing if invoices already exist
   * for the order. Produces:
   *   • one SERVICE invoice  (carrier → client), VAT only if the carrier is
   *     VAT-registered;
   *   • one COMMISSION invoice per bearer (platform → carrier and/or client),
   *     always with VAT. BOTH ⇒ two commission invoices (half each).
   * Returns the created invoice ids.
   */
  async generateForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    fin: OrderFinancials,
  ): Promise<string[]> {
    const existing = await tx.invoice.count({ where: { orderId } });
    if (existing > 0) return [];

    const order = (await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, clientId: true, carrierId: true,
        client: { select: { nameAr: true, vatNumber: true, crNumber: true } },
        carrier: { select: { nameAr: true, vatNumber: true, crNumber: true, vatRegistered: true } },
      },
    })) as InvoiceableOrder | null;
    if (!order || !order.carrier || !order.carrierId) return [];

    const platform = await this.platformIdentity(tx);
    const created: string[] = [];

    // ── SERVICE invoice: carrier → client ──────────────────────────────────
    const svcSellerVat = order.carrier.vatRegistered ? order.carrier.vatNumber : null;
    const svc = await tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        kind: 'SERVICE', status: 'ISSUED',
        orderId: order.id,
        issuerId: order.carrierId,
        receiverId: order.clientId,
        amount: fin.serviceBase,
        vatAmount: fin.serviceVat,
        totalAmount: fin.serviceTotal,
        sellerName: order.carrier.nameAr,
        sellerVatNumber: svcSellerVat,
        sellerCrNumber: order.carrier.crNumber,
        vatNumber: svcSellerVat,
        crNumber: order.carrier.crNumber,
        buyerName: order.client.nameAr,
        buyerVatNumber: order.client.vatNumber,
        buyerCrNumber: order.client.crNumber,
        zatcaQr: zatcaQrBase64({
          sellerName: order.carrier.nameAr ?? '—',
          vatNumber: svcSellerVat ?? '',
          timestamp: new Date(),
          total: fin.serviceTotal,
          vatTotal: fin.serviceVat,
        }),
        notes: `فاتورة خدمة نقل للطلب ${order.orderNumber}`,
      },
      select: { id: true },
    });
    created.push(svc.id);

    // ── COMMISSION invoice(s): platform → bearer(s) ────────────────────────
    const commissionBuyers: Array<{ buyer: 'CARRIER' | 'CLIENT'; base: number; vat: number; total: number }> = [];
    if (fin.commissionAppliesTo === 'CLIENT') {
      commissionBuyers.push({ buyer: 'CLIENT', base: fin.commission, vat: fin.commissionVat, total: fin.commissionTotal });
    } else if (fin.commissionAppliesTo === 'BOTH') {
      const base = r2(fin.commission / 2);
      const vat = r2(fin.commissionVat / 2);
      commissionBuyers.push({ buyer: 'CARRIER', base, vat, total: r2(base + vat) });
      commissionBuyers.push({
        buyer: 'CLIENT',
        base: r2(fin.commission - base),
        vat: r2(fin.commissionVat - vat),
        total: r2(fin.commissionTotal - r2(base + vat)),
      });
    } else {
      commissionBuyers.push({ buyer: 'CARRIER', base: fin.commission, vat: fin.commissionVat, total: fin.commissionTotal });
    }

    for (const c of commissionBuyers) {
      if (c.total <= 0) continue;
      const buyerCo = c.buyer === 'CARRIER' ? order.carrier : order.client;
      const com = await tx.invoice.create({
        data: {
          invoiceNumber: await nextInvoiceNumber(tx),
          kind: 'COMMISSION', status: 'ISSUED',
          orderId: order.id,
          issuerId: null, // the platform has no Company row
          receiverId: c.buyer === 'CARRIER' ? order.carrierId : order.clientId,
          amount: c.base,
          vatAmount: c.vat,
          totalAmount: c.total,
          sellerName: platform.name,
          sellerVatNumber: platform.vatNumber,
          sellerCrNumber: platform.crNumber,
          vatNumber: platform.vatNumber,
          crNumber: platform.crNumber,
          buyerName: buyerCo.nameAr,
          buyerVatNumber: buyerCo.vatNumber,
          buyerCrNumber: buyerCo.crNumber,
          zatcaQr: zatcaQrBase64({
            sellerName: platform.name ?? '—',
            vatNumber: platform.vatNumber ?? '',
            timestamp: new Date(),
            total: c.total,
            vatTotal: c.vat,
          }),
          notes: `فاتورة عمولة المنصة للطلب ${order.orderNumber}`,
        },
        select: { id: true },
      });
      created.push(com.id);
    }

    return created;
  }

  /** Platform legal identity (seller on commission invoices) from settings. */
  private async platformIdentity(tx: Prisma.TransactionClient) {
    const rows = await tx.setting.findMany({
      where: { key: { in: ['platform_name_ar', 'platform_vat_number', 'platform_cr_number'] } },
      select: { key: true, value: true },
    });
    const get = (k: string) => rows.find((r) => r.key === k)?.value ?? null;
    return {
      name: get('platform_name_ar') ?? 'نقلة لوجيستك',
      vatNumber: get('platform_vat_number'),
      crNumber: get('platform_cr_number'),
    };
  }

  private isAdmin(actor: AuthUser): boolean {
    return actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
  }
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
