'use client'

import { useParams } from 'next/navigation'
import { EnquiryDetail } from '@/components/admin/Enquiries'

export default function EnquiryPage() {
  const { id } = useParams<{ id: string }>()
  return <EnquiryDetail key={id} id={id} />
}
