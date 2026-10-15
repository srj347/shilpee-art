// Studio end to end: sign in, add a work with a photo, publish, quick actions, reorder, delete.
// Needs: dev server with MAIL_DRIVER=console, ADMIN_EMAILS containing studio@example.test.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { BASE, check, done, launch } from './harness.mjs'

const OUTBOX = path.resolve('storage/outbox')
const EMAIL = 'studio@example.test'
const TITLE = `E2E Study ${Date.now().toString(36)}`

async function latestLink() {
  const files = (await readdir(OUTBOX)).filter((f) => f.endsWith('.txt')).sort()
  const text = await readFile(path.join(OUTBOX, files.at(-1)), 'utf8')
  return text.match(/https?:\/\/\S+\/api\/auth\/verify\?token=[\w-]+/)?.[0]
}

export async function signIn(page) {
  await page.goto(`${BASE}/admin`)
  await page.waitForURL(/\/admin\/sign-in/)
  await page.fill('#si-email', EMAIL)
  await page.click('button[type=submit]')
  await page.getByText('Check your email').waitFor()
  const link = await latestLink()
  await page.goto(link)
  await page.waitForURL(`${BASE}/admin`)
}

const { browser, page, errors } = await launch({ mobile: true })
try {
  await signIn(page)
  await page.locator('.rowi').first().waitFor()
  check('signed in and works list loads', (await page.locator('.rowi').count()) > 0)

  // Add a work
  await page.click('text=Add work')
  await page.waitForURL(/\/admin\/works\/new/)
  await page.fill('#w-title', TITLE)
  await page.fill('#w-h', '61')
  await page.fill('#w-w', '76')
  await page.fill('#w-medium', 'Watercolour and ink on cotton paper')
  await page.fill('#w-price', '42000')
  check('medium sets filter tags', (await page.locator('#w-medium ~ .hint').textContent())?.includes('Watercolour, Ink'))
  check('medium sets "Painted on: Paper"', (await page.locator('.chip[aria-pressed=true]', { hasText: 'Paper' }).count()) === 1)
  const jpeg = await sharp({ create: { width: 1600, height: 1284, channels: 3, background: '#7d939a' } }).jpeg().toBuffer()
  await page.setInputFiles('input[type=file]', { name: 'e2e.jpg', mimeType: 'image/jpeg', buffer: jpeg })
  await page.locator('.photo .role', { hasText: 'Main' }).waitFor({ timeout: 30000 })
  check('photo uploads and becomes Main', true)
  await page.click('.save-bar >> text=Put on website')
  await page.waitForURL(/\/admin\/works\/[a-f0-9]{24}$/)
  const id = page.url().split('/').pop()
  await page.locator('.toast', { hasText: 'is on the website' }).waitFor()
  check('publish shows a confirmation', true)

  const slug = TITLE.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  let res = await page.request.get(`${BASE}/works/${slug}`)
  check('new work page is live at once', (await res.text()).includes(TITLE))

  // Quick action from the list: mark as sold
  await page.goto(`${BASE}/admin`)
  const row = page.locator('.rowi', { hasText: TITLE })
  await row.waitFor()
  await row.getByRole('button', { name: /More actions/ }).click()
  await page.locator('.menu-sheet >> text=Mark as sold').click()
  await page.locator('.toast', { hasText: 'sold' }).waitFor()
  res = await page.request.get(`${BASE}/works/${slug}`)
  check('marked sold shows on the public page', (await res.text()).includes('Ask about a similar work'))

  // Star (featured) toggles
  const star = row.getByRole('button', { name: /Selected works/ })
  const before = await star.getAttribute('aria-pressed')
  await star.click()
  await page.waitForTimeout(400)
  check('star toggles featured', (await star.getAttribute('aria-pressed')) !== before)

  // Reorder by dragging the first row down two places
  await page.click('text=Reorder')
  const titles = async () => page.locator('.rowi .ttl').allTextContents()
  const first = (await titles())[0]
  const handle = page.locator('.rowi .handle').first()
  const box = await handle.boundingBox()
  const rowH = (await page.locator('.rowi').first().boundingBox()).height
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + 10, box.y + 10 + i * rowH * 0.22)
  await page.mouse.up()
  const after = await titles()
  check('drag moves the row down two places', after[2] === first, `${first} → position ${after.indexOf(first)}`)
  await page.click('text=Save order')
  await page.locator('.toast', { hasText: 'New order saved' }).waitFor()
  check('order saves', true)

  // Delete with confirmation
  await page.locator('.rowi', { hasText: TITLE }).getByRole('button', { name: /More actions/ }).click()
  await page.locator('.menu-sheet button.danger', { hasText: 'Delete' }).click()
  await page.locator('.menu-sheet button.danger', { hasText: `Delete ${TITLE}` }).click()
  await page.locator('.toast', { hasText: 'deleted' }).waitFor()
  check('delete asks first, then removes the row', (await page.locator('.rowi', { hasText: TITLE }).count()) === 0)
  res = await page.request.get(`${BASE}/works/${slug}`)
  check('deleted work is gone from the site', !(await res.text()).includes(TITLE))

  // Restore the original order: move the first row back
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  void id
} catch (e) {
  check('studio flow ran without exceptions', false, String(e).slice(0, 300))
} finally {
  await browser.close()
  done()
}
