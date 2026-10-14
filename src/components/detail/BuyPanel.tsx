'use client'

import { useState } from 'react'
import { useHash } from '@/lib/use-client-store'
import { useEnquiry } from '@/components/enquiry/EnquiryProvider'
import { editionLine, formatInr, priceLabel, sizeCm } from '@/lib/format'
import { track, whatsappLink, whatsappText, type EnquiryRequest } from '@/lib/enquiry-client'
import { mainImage } from '@/lib/selectors'
import type { Artwork, PrintVariant, Settings } from '@/lib/types'

function originalFacts(w: Artwork, s: Settings): string[] {
  const facts: string[] = []
  const p = w.original.presentation
  if (p === 'stretched') facts.push(w.original.readyToHang ? 'Stretched, ready to hang' : 'Stretched canvas')
  if (p === 'framed') facts.push(w.original.frameNote || 'Framed, ready to hang')
  if (p === 'rolled') facts.push('Ships rolled in a tube')
  if (p === 'unframed-paper') facts.push('Unframed, on paper. Framing on request')
  if (w.certificate.included) facts.push('Certificate of authenticity included')
  const days = w.shipping.leadTimeDays ?? s.defaults.leadTimeDays
  facts.push(`Ships from ${s.defaults.shipsFrom.split(',')[0]} in about ${days} days`)
  return facts
}

export function originalRequest(w: Artwork): EnquiryRequest {
  const base = {
    id: w.id,
    title: w.title,
    year: w.year,
    size: sizeCm(w.heightCm, w.widthCm),
    image: mainImage(w),
    slug: w.slug,
  }
  if (w.availability === 'upcoming') return { type: 'upcoming', artwork: { ...base, meta: 'In the studio' } }
  if (w.availability === 'sold' || !w.original.forSale)
    return { type: 'commission', intent: 'similar', artwork: { ...base, meta: 'Sold · ask about a similar work' } }
  return {
    type: 'original',
    intent: w.availability === 'reserved' ? 'next-in-line' : undefined,
    artwork: { ...base, meta: `Original · ${priceLabel(w.original.price)}` },
  }
}

export function originalButtonLabel(w: Artwork): string {
  if (w.availability === 'upcoming') return 'Register interest'
  if (w.availability === 'sold' || !w.original.forSale) return 'Ask about a similar work'
  if (w.availability === 'reserved') return 'Ask to be next in line'
  return 'Enquire about this work'
}

const soldOut = (v: PrintVariant) => !!v.editionSize && v.editionsSold >= v.editionSize

export function BuyPanel({ work, settings, pageUrl }: { work: Artwork; settings: Settings; pageUrl: string }) {
  const { open, contact } = useEnquiry()
  const variants = work.prints.variants.filter((v) => v.active)
  const hasPrints = work.prints.enabled && variants.length > 0 && work.availability !== 'upcoming'
  const hash = useHash()
  const [chosenTab, setTab] = useState<'original' | 'prints' | null>(null)
  const tab = chosenTab ?? (hasPrints && hash === '#prints' ? 'prints' : 'original')
  const materials = Array.from(new Set(variants.map((v) => v.material)))
  const [material, setMaterial] = useState(materials[0])
  const firstAvailable = (m?: string) => variants.find((v) => v.material === m && !soldOut(v)) ?? variants.find((v) => v.material === m)
  const [variantId, setVariantId] = useState(firstAvailable(materials[0])?.id)
  const variant = variants.find((v) => v.id === variantId)

  const switchTab = (t: 'original' | 'prints') => {
    setTab(t)
    history.replaceState(null, '', t === 'prints' ? '#prints' : location.pathname + location.search)
  }

  const req: EnquiryRequest =
    tab === 'prints' && variant
      ? {
          type: 'print',
          artwork: { ...originalRequest(work).artwork!, meta: 'Print' },
          print: { variantId: variant.id, label: variant.label, priceInr: variant.priceInr },
        }
      : originalRequest(work)
  const wa = contact.whatsapp ? whatsappLink(contact.whatsapp, whatsappText(req, pageUrl, contact.artistName.split(' ')[0])) : ''

  const originalPanel = (
    <div className="panel" role={hasPrints ? 'tabpanel' : undefined} id="panel-original" aria-labelledby={hasPrints ? 'tab-original' : undefined}>
      {work.availability !== 'upcoming' && work.original.forSale && work.availability !== 'sold' ? (
        <span className="price">{priceLabel(work.original.price)}</span>
      ) : null}
      {work.availability !== 'upcoming' ? (
        <ul className="facts">
          {originalFacts(work, settings).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
      <div className="actions">
        <button data-primary-enquire type="button" className="btn" onClick={() => open(req)}>
          {originalButtonLabel(work)}
        </button>
        {wa ? (
          <a className="textlink" href={wa} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { from: 'detail' })}>
            Ask on WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  )

  if (!hasPrints) return originalPanel

  const shown = variants.filter((v) => v.material === material)
  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="seg" role="tablist" aria-label="Original or print">
        <button id="tab-original" role="tab" type="button" aria-selected={tab === 'original'} aria-controls="panel-original" onClick={() => switchTab('original')}>
          Original
        </button>
        <button id="tab-prints" role="tab" type="button" aria-selected={tab === 'prints'} aria-controls="panel-prints" onClick={() => switchTab('prints')}>
          Prints
        </button>
      </div>
      {tab === 'original' ? (
        originalPanel
      ) : (
        <div className="panel" role="tabpanel" id="panel-prints" aria-labelledby="tab-prints" key="prints">
          {variant ? (
            <span className="price" key={variant.id} style={{ animation: 'fade-up 200ms var(--ease-out)' }}>
              {formatInr(variant.priceInr)}
            </span>
          ) : null}
          {materials.length > 1 ? (
            <fieldset className="option-group">
              <legend className="eyebrow">Material</legend>
              <div className="options">
                {materials.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="chip"
                    aria-pressed={material === m}
                    onClick={() => {
                      setMaterial(m)
                      setVariantId(firstAvailable(m)?.id)
                    }}
                  >
                    {m === 'paper' ? 'Cotton paper' : 'Canvas'}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <fieldset className="option-group">
            <legend className="eyebrow">Size</legend>
            <div className="options">
              {shown.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="chip"
                  aria-pressed={variantId === v.id}
                  disabled={soldOut(v)}
                  style={soldOut(v) ? { opacity: 0.45, textDecoration: 'line-through' } : undefined}
                  onClick={() => {
                    setVariantId(v.id)
                    track('print_option', { variant: v.label })
                  }}
                >
                  {sizeCm(v.heightCm, v.widthCm)}
                  {v.framed ? ', framed' : ''}
                </button>
              ))}
            </div>
          </fieldset>
          {variant ? (
            <ul className="facts">
              <li>{variant.substrate}{variant.finish ? `, ${variant.finish} finish` : ''}</li>
              <li>{variant.framed ? variant.frameNote || 'Framed, ready to hang' : variant.material === 'canvas' ? 'Stretched, ready to hang' : 'Unframed, ships rolled in a tube'}</li>
              <li>{editionLine(work.prints.edition, variant.editionSize, variant.editionsSold)}{work.prints.signed ? ', signed' : ''}</li>
              <li>Made to order in about {settings.defaults.printLeadTimeDays} days</li>
            </ul>
          ) : null}
          <div className="actions">
            <button data-primary-enquire type="button" className="btn" disabled={!variant || soldOut(variant)} onClick={() => open(req)}>
              Enquire about this print
            </button>
            {wa ? (
              <a className="textlink" href={wa} target="_blank" rel="noopener" onClick={() => track('whatsapp_click', { from: 'prints' })}>
                Ask on WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
