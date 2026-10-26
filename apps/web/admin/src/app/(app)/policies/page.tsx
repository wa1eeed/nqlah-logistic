'use client';
import { useState } from 'react';
import { Users, Truck, Layers, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { ClientPoliciesPanel } from '@/components/settings/client-policies-panel';
import { CarrierGroupsPanel } from '@/components/settings/carrier-groups-panel';
import { PlansPanel } from '@/components/settings/plans-panel';
import { PlanModulesPanel } from '@/components/settings/plan-modules-panel';

type Tab = 'plans' | 'modules' | 'clients' | 'carriers';

/**
 * Workflow & Policy Engine — the control center that drives how the platform
 * operates per company: Plans (memberships) wrap Policy Profiles (client groups)
 * which carry the modules, capability features/limits, commission and visibility.
 */
export default function AdminPolicyEnginePage() {
  const [tab, setTab] = useState<Tab>('plans');
  return (
    <>
      <PageHeader
        eyebrow="إدارة المنصّة"
        title="محرك السياسات والتشغيل"
        subtitle="الباقات والعضويات، ملفات السياسة (الموديولز + الميزات + العمولة + الظهور)، ومجموعات المزوّدين — تحكّم كامل بآلية العمل."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans"><Layers className="h-4 w-4 me-1.5" /> الباقات والعضويات</TabsTrigger>
          <TabsTrigger value="modules"><Sparkles className="h-4 w-4 me-1.5" /> موديولز الباقات</TabsTrigger>
          <TabsTrigger value="clients"><SlidersHorizontal className="h-4 w-4 me-1.5" /> ملفات السياسة</TabsTrigger>
          <TabsTrigger value="carriers"><Truck className="h-4 w-4 me-1.5" /> مجموعات المزوّدين</TabsTrigger>
        </TabsList>
        <TabsContent value="plans"><PlansPanel /></TabsContent>
        <TabsContent value="modules"><PlanModulesPanel /></TabsContent>
        <TabsContent value="clients"><ClientPoliciesPanel /></TabsContent>
        <TabsContent value="carriers"><CarrierGroupsPanel /></TabsContent>
      </Tabs>
    </>
  );
}
