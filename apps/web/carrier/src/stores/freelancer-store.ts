'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FREELANCER_INVOICES_SEED,
  type FreelancerInvoice,
  type FreelancerInvoiceStatus,
} from '@naqla/shared-utils';

/**
 * Per-trip invoices the provider (carrier) owes to FREELANCER trucks/drivers.
 *
 * Two sources are merged:
 *  - `FREELANCER_INVOICES_SEED` (shared baseline, read-only), and
 *  - `created` — invoices issued during the session when the provider assigns
 *    an order to a freelancer and sets the trip fee.
 *
 * `statusOverride` lets the demo flip a seeded invoice's status (mark paid /
 * reopen) without mutating the shared seed. Demo state only (localStorage,
 * carrier origin); real invoicing is backend work.
 */
interface NewInvoiceInput {
  id?: string;
  orderId: string;
  orderNumber: string;
  truckId: string;
  driverId?: string;
  amount: number;
}

interface FreelancerState {
  created: FreelancerInvoice[];
  /** invoiceId → status, overriding the stored value (seed or created). */
  statusOverride: Record<string, FreelancerInvoiceStatus>;
  /** paidAt timestamps captured when an invoice is marked paid here. */
  paidAt: Record<string, string>;
  addInvoice: (carrierId: string, input: NewInvoiceInput) => FreelancerInvoice;
  markPaid: (id: string) => void;
  markDue: (id: string) => void;
  /** Invoice already issued for this order's truck? (avoid duplicates). */
  invoiceForOrderTruck: (orderId: string, truckId: string) => FreelancerInvoice | undefined;
  resetInvoices: () => void;
}

function nextId(existing: FreelancerInvoice[]): string {
  const nums = [...FREELANCER_INVOICES_SEED, ...existing]
    .map((i) => Number(i.id.replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `INV-F-${String(max + 1).padStart(4, '0')}`;
}

export const useFreelancerStore = create<FreelancerState>()(
  persist(
    (set, get) => ({
      created: [],
      statusOverride: {},
      paidAt: {},
      addInvoice: (carrierId, input) => {
        const existing = get().created;
        const invoice: FreelancerInvoice = {
          id: input.id ?? nextId(existing),
          carrierId,
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          truckId: input.truckId,
          driverId: input.driverId,
          amount: input.amount,
          status: 'DUE',
          issuedAt: new Date().toISOString(),
        };
        set((s) => ({ created: [invoice, ...s.created] }));
        return invoice;
      },
      markPaid: (id) =>
        set((s) => ({
          statusOverride: { ...s.statusOverride, [id]: 'PAID' },
          paidAt: { ...s.paidAt, [id]: new Date().toISOString() },
        })),
      markDue: (id) =>
        set((s) => {
          const override = { ...s.statusOverride, [id]: 'DUE' as FreelancerInvoiceStatus };
          const paid = { ...s.paidAt };
          delete paid[id];
          return { statusOverride: override, paidAt: paid };
        }),
      invoiceForOrderTruck: (orderId, truckId) =>
        get().created.find((i) => i.orderId === orderId && i.truckId === truckId),
      resetInvoices: () => set({ created: [], statusOverride: {}, paidAt: {} }),
    }),
    { name: 'naqla:freelancer-invoices' },
  ),
);

/**
 * Merge seed + created invoices for a carrier, apply status/paidAt overrides,
 * newest first. Pure read helper for pages/components.
 */
export function resolveInvoices(
  carrierId: string,
  state: Pick<FreelancerState, 'created' | 'statusOverride' | 'paidAt'>,
): FreelancerInvoice[] {
  return [...state.created, ...FREELANCER_INVOICES_SEED]
    .filter((i) => i.carrierId === carrierId)
    .map((i) => {
      const status = state.statusOverride[i.id] ?? i.status;
      const paidAt = status === 'PAID' ? (state.paidAt[i.id] ?? i.paidAt) : undefined;
      return { ...i, status, paidAt };
    })
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}
