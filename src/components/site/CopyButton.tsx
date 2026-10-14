'use client'

import { useState } from 'react'

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="textlink"
      style={{ fontSize: 13 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          // Clipboard refused: the address stays visible and selectable.
        }
      }}
    >
      <span aria-live="polite">{done ? 'Copied' : label}</span>
    </button>
  )
}
