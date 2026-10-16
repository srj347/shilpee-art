'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { WorkEditor } from '@/components/admin/WorkEditor'

export default function NewWorkPage() {
  const from = useSearchParams().get('from') ?? undefined
  // Next.js keeps this page hidden after a save, with its state. Without a reset, the next
  // "Add work" shows the saved work again, and saving it creates a second copy.
  const [round, setRound] = useState(0)
  const created = useRef(false)
  useLayoutEffect(() => {
    return () => {
      if (created.current) {
        created.current = false
        setRound((r) => r + 1)
      }
    }
  }, [])
  return <WorkEditor key={`${from ?? 'new'}-${round}`} fromId={from} onCreated={() => (created.current = true)} />
}
