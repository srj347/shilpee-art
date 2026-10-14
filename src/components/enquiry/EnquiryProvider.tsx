'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { track, type EnquiryRequest } from '@/lib/enquiry-client'
import { EnquirySheet } from './EnquirySheet'

export type SheetContact = { whatsapp: string; replyPromise: string; artistName: string }
type Ctx = { open: (req: EnquiryRequest) => void; contact: SheetContact }
type SheetState = { request: EnquiryRequest; nonce: number; open: boolean }

const EnquiryContext = createContext<Ctx | null>(null)

export function useEnquiry(): Ctx {
  const ctx = useContext(EnquiryContext)
  if (!ctx) throw new Error('useEnquiry must be used inside EnquiryProvider')
  return ctx
}

export function EnquiryProvider({ contact, children }: { contact: SheetContact; children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const nonce = useRef(0)

  const open = useCallback((request: EnquiryRequest) => {
    opener.current = document.activeElement as HTMLElement | null
    nonce.current += 1
    setSheet({ request, nonce: nonce.current, open: true })
    track('enquiry_open', { type: request.type })
  }, [])

  // Starts the closing animation; the sheet calls onClosed when it has finished.
  const close = useCallback(() => setSheet((s) => (s ? { ...s, open: false } : s)), [])
  const onClosed = useCallback(() => {
    setSheet((s) => (s && !s.open ? null : s))
    opener.current?.focus?.()
  }, [])

  return (
    <EnquiryContext.Provider value={{ open, contact }}>
      {children}
      {sheet ? (
        <EnquirySheet
          key={sheet.nonce}
          request={sheet.request}
          open={sheet.open}
          contact={contact}
          onClose={close}
          onClosed={onClosed}
        />
      ) : null}
    </EnquiryContext.Provider>
  )
}
