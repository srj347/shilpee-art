// Tiny end-to-end harness: the installed Google Chrome, driven by playwright-core.
// Usage: node tests/e2e/<file>.mjs   (the dev server must run on BASE, default http://localhost:3000)
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
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

export const OUTBOX = path.resolve('storage/outbox')

/** Mail files written since `since` (ms), newest last. */
export async function outboxSince(since) {
  const files = (await readdir(OUTBOX).catch(() => [])).filter((f) => f.endsWith('.txt')).sort()
  const out = []
  for (const f of files) {
    const full = path.join(OUTBOX, f)
    const { mtimeMs } = await import('node:fs').then((fs) => fs.promises.stat(full))
    if (mtimeMs >= since) out.push(await readFile(full, 'utf8'))
  }
  return out
}

export async function signIn(page, email = 'studio@example.test') {
  await page.goto(`${BASE}/admin`)
  await page.waitForURL(/\/admin\/sign-in/)
  await page.fill('#si-email', email)
  const since = Date.now() - 1000
  await page.click('button[type=submit]')
  await page.getByText('Check your email').waitFor()
  const mails = await outboxSince(since)
  const link = mails.at(-1)?.match(/https?:\/\/\S+\/api\/auth\/verify\?token=[\w-]+/)?.[0]
  await page.goto(link)
  await page.waitForURL(`${BASE}/admin`)
}
