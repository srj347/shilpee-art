'use client'

import type { EnquiryRequest } from '@/lib/enquiry-client'
import { useEnquiry } from './EnquiryProvider'

/** Opens the enquiry sheet from a server-rendered page. */
export function EnquireButton({
  request,
  children,
  variant = 'btn',
}: {
  request: EnquiryRequest
  children: React.ReactNode
  variant?: 'btn' | 'link'
}) {
  const { open } = useEnquiry()
  return (
    <button type="button" className={variant === 'btn' ? 'btn' : 'textlink'} onClick={() => open(request)}>
      {children}
    </button>
  )
}
