import { redirect } from 'next/navigation';

// The combined companies list was split into /clients and /carriers.
// The shared detail route /companies/[id] stays.
export default function AdminCompaniesPage() {
  redirect('/carriers');
}
