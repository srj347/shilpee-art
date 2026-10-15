// Tiny end-to-end harness: the installed Google Chrome, driven by playwright-core.
// Usage: node tests/e2e/<file>.mjs   (the dev server must run on BASE, default http://localhost:3000)
import { chromium } from 'playwright-core'

export const BASE = process.env.BASE || 'http://localhost:3000'

export async function launch({ mobile = true } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 860 } },
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return { browser, context, page, errors }
}

let failures = 0
export function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
export function done() {
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
  process.exit(failures ? 1 : 0)
}
