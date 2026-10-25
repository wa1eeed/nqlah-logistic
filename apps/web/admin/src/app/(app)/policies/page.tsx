'use client';
import { useState } from 'react';
import { Users, Truck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { ClientPoliciesPanel } from '@/components/settings/client-policies-panel';
import { CarrierGroupsPanel } from '@/components/settings/carrier-groups-panel';

/**
 * Dedicated "Policies & Groups" control center — split out of the general
 * Settings page so market organization (client policy groups + provider groups
 * + visibility) has its own clear, professional home.
 */
export default function AdminPoliciesPage() {
  const [tab, setTab] = useState<'clients' | 'carriers'>('clients');
  return (
    <>
      <PageHeader
        eyebrow="إدارة المنصّة"
        title="السياسات والمجموعات"
        subtitle="نظّم السوق: مجموعات العملاء (الإسناد/التسعير/التحصيل/الظهور) ومجموعات المزوّدين."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'clients' | 'carriers')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients"><Users className="h-4 w-4 me-1.5" /> مجموعات العملاء</TabsTrigger>
          <TabsTrigger value="carriers"><Truck className="h-4 w-4 me-1.5" /> مجموعات المزوّدين</TabsTrigger>
        </TabsList>
        <TabsContent value="clients"><ClientPoliciesPanel /></TabsContent>
        <TabsContent value="carriers"><CarrierGroupsPanel /></TabsContent>
      </Tabs>
    </>
  );
}
