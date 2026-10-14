'use client'

import { useState } from 'react'
import { track } from '@/lib/enquiry-client'
import { cmToIn } from '@/lib/format'

const FLOOR = 250 // y of the floor line, in cm from the top of the drawing
const PERSON = 165

/**
 * "See it at scale": the work at its real size beside a 165 cm figure,
 * centred on the gallery line 150 cm above the floor.
 */
export function ScaleView({ heightCm, widthCm, colour }: { heightCm: number; widthCm: number; colour: string }) {
  const [open, setOpen] = useState(false)
  const centre = Math.max(FLOOR - 150, heightCm / 2 + 6) // lift very tall works so they fit
  const y = Math.min(centre - heightCm / 2, FLOOR - heightCm - 2)
  const x = 110
  const width = Math.max(340, x + widthCm + 30)
  const top = Math.min(0, y - 6)
  const pTop = FLOOR - PERSON

  return (
    <div className="stack" style={{ gap: 12 }}>
      <button
        type="button"
        className="textlink"
        aria-expanded={open}
        aria-controls="scale-view"
        onClick={() => {
          setOpen((o) => !o)
          if (!open) track('scale_view')
        }}
        style={{ alignSelf: 'flex-start' }}
      >
        {open ? 'Hide the scale view' : 'See it at scale'}
      </button>
      <div
        id="scale-view"
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 280ms var(--ease-snap)',
        }}
      >
        <div style={{ overflow: 'hidden' }} inert={!open}>
          <figure className="scale-box" style={{ margin: 0 }}>
            <svg viewBox={`0 ${top} ${width} ${FLOOR + 12 - top}`} role="img" aria-labelledby="scale-cap">
              <line className="sv-line" x1="0" y1={FLOOR - 150} x2={width} y2={FLOOR - 150} />
              <line className="sv-floor" x1="0" y1={FLOOR} x2={width} y2={FLOOR} />
              <g className="sv-person">
                <circle cx="60" cy={pTop + 10} r="10" />
                <rect x="46" y={pTop + 22} width="28" height="62" rx="8" />
                <rect x="49" y={pTop + 80} width="10" height={PERSON - 80} rx="3" />
                <rect x="61" y={pTop + 80} width="10" height={PERSON - 80} rx="3" />
              </g>
              <rect x={x} y={y} width={widthCm} height={heightCm} fill={colour} />
            </svg>
            <figcaption id="scale-cap" className="meta">
              {heightCm} × {widthCm} cm ({cmToIn(heightCm)} × {cmToIn(widthCm)} in) beside a 165 cm figure. Dashed line: the gallery centre line, 150 cm from the floor.
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  )
}
