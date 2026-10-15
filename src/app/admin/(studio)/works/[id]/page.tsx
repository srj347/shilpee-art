'use client'

import { useParams } from 'next/navigation'
import { WorkEditor } from '@/components/admin/WorkEditor'

export default function EditWorkPage() {
  const { id } = useParams<{ id: string }>()
  return <WorkEditor key={id} id={id} />
}
