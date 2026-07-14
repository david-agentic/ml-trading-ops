import { redirect } from 'next/navigation';
import { AuthedPlaceholder } from '@/components/auth/AuthedPlaceholder';
import { getCurrentUser } from '@/lib/server-auth';

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <AuthedPlaceholder name={user.name} role={user.role} portalName="Reseller Shop" />;
}
