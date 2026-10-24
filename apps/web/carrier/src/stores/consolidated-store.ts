'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConsolidatedLeg } from '@naqla/shared-utils';

interface LegAssignment { truckId: string; driverId: string; }

interface ConsolidatedState {
  /** orderId → legIndex → assignment (carrier's distribution overlay). */
  overrides: Record<string, Record<number, LegAssignment>>;
  distribute: (orderId: string, index: number, truckId: string, driverId: string) => void;
  clearLeg: (orderId: string, index: number) => void;
  /** Clear all consolidated-order distributions (demo convenience). */
  resetAll: () => void;
}

export const useConsolidatedStore = create<ConsolidatedState>()(
  persist(
    (set) => ({
      overrides: {},
      distribute: (orderId, index, truckId, driverId) =>
        set((s) => ({
          overrides: {
            ...s.overrides,
            [orderId]: { ...(s.overrides[orderId] ?? {}), [index]: { truckId, driverId } },
          },
        })),
      clearLeg: (orderId, index) =>
        set((s) => {
          const forOrder = { ...(s.overrides[orderId] ?? {}) };
          delete forOrder[index];
          return { overrides: { ...s.overrides, [orderId]: forOrder } };
        }),
      resetAll: () => set({ overrides: {} }),
    }),
    { name: 'naqla:consolidated', version: 1 },
  ),
);

/** Merge the seeded legs with the carrier's distribution overlay. */
export function effectiveLegs(
  seedLegs: ConsolidatedLeg[],
  overrides: Record<number, LegAssignment> = {},
): ConsolidatedLeg[] {
  return seedLegs.map((leg) => {
    const ov = overrides[leg.index];
    if (!ov) return leg;
    return {
      ...leg,
      truckId: ov.truckId,
      driverId: ov.driverId,
      status: leg.status === 'PENDING' ? 'ASSIGNED' : leg.status,
    };
  });
}
