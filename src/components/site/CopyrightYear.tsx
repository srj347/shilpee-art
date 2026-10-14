'use client'

import { useYear } from '@/lib/use-client-store'

/** The year, without making the static page depend on request time. */
export function CopyrightYear() {
  return <>{useYear(2026)}</>
}
