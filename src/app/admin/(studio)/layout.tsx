import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { StudioShell } from '@/components/admin/StudioShell'
import { getAdminEmail } from '@/lib/auth'

async function Gate({ children }: { children: React.ReactNode }) {
  const email = await getAdminEmail()
  if (!email) redirect('/admin/sign-in')
  return <StudioShell email={email}>{children}</StudioShell>
}

export default function StudioLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Suspense fallback={<div className="studio" aria-busy="true" />}>
      <Gate>{children}</Gate>
    </Suspense>
  )
}
