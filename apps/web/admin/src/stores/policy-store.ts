'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  POLICY_GROUPS_SEED, DEFAULT_CLIENT_POLICY,
  type ClientPolicy, type PolicyGroup,
} from '@naqla/shared-utils';

interface PolicyState {
  groups: PolicyGroup[];
  addGroup: (name: string, description?: string) => string;
  renameGroup: (id: string, name: string, description?: string) => void;
  setGroupPolicy: (id: string, policy: ClientPolicy) => void;
  removeGroup: (id: string) => void;
  /** Assign a client to one group (removing from others), or null for default. */
  setClientGroup: (clientId: string, groupId: string | null) => void;
  resetGroups: () => void;
}

let seq = 0;
const newId = () => `pg-${Date.now().toString(36)}-${seq++}`;

export const usePolicyStore = create<PolicyState>()(
  persist(
    (set) => ({
      groups: POLICY_GROUPS_SEED,

      addGroup: (name, description) => {
        const id = newId();
        set((s) => ({
          groups: [
            ...s.groups,
            { id, name, description, policy: { ...DEFAULT_CLIENT_POLICY }, clientIds: [] },
          ],
        }));
        return id;
      },

      renameGroup: (id, name, description) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, name, description } : g)) })),

      setGroupPolicy: (id, policy) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, policy } : g)) })),

      removeGroup: (id) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

      setClientGroup: (clientId, groupId) =>
        set((s) => ({
          groups: s.groups.map((g) => {
            const without = g.clientIds.filter((c) => c !== clientId);
            if (g.id === groupId) return { ...g, clientIds: [...without, clientId] };
            return { ...g, clientIds: without };
          }),
        })),

      resetGroups: () => set({ groups: POLICY_GROUPS_SEED }),
    }),
    { name: 'naqla:client-policies', version: 1 },
  ),
);
