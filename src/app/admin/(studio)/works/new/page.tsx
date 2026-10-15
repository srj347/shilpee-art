'use client'

import { useSearchParams } from 'next/navigation'
import { WorkEditor } from '@/components/admin/WorkEditor'

export default function NewWorkPage() {
  const from = useSearchParams().get('from') ?? undefined
  return <WorkEditor key={from ?? 'new'} fromId={from} />
}
