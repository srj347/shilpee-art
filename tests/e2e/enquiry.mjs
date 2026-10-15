// Public site end to end: enquiry sheet (original and print), emails, spam rules,
// contact form, viewer gestures with a mouse, and the Studio inbox.
import { BASE, check, done, launch, outboxSince, signIn } from './harness.mjs'

const WORK = '/works/monsoon-grey'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const visible = (page, sel) => page.locator(`${sel} >> visible=true`)

const { browser, page, errors } = await launch({ mobile: true })
try {
  // 1. Original: open the sheet from the main button
  await page.goto(`${BASE}${WORK}`)
  const primary = visible(page, '[data-primary-enquire]').first()
  await primary.waitFor()
  await primary.click()
  const sheet = page.locator('.sheet')
  await sheet.waitFor()
  check('sheet opens with the work attached', (await sheet.locator('.ctx').textContent())?.includes('Monsoon Grey'))
  check('message is pre-written', (await page.inputValue('#enq-message')).includes('Monsoon Grey'))

  // Validation
  await sheet.locator('button[type=submit]').click()
  check('empty name and email show errors', (await sheet.locator('.error').count()) === 2)

  await page.fill('#enq-name', 'Ananya Rao')
  await page.fill('#enq-email', 'ananya@example.com')
  await page.fill('#enq-phone', '+91 98480 12345')
  await sleep(3200) // the form refuses sends faster than 3 seconds
  const since = Date.now()
  await sheet.locator('button[type=submit]').click()
  await sheet.locator('.sent').waitFor()
  const sentText = await sheet.locator('.sent').textContent()
  const ref = sentText?.match(/E-\d{4}-\d{4}/)?.[0]
  check('sent state thanks the visitor by first name', sentText?.includes('Thank you, Ananya'), ref)
  await sleep(1500)
  const mails = await outboxSince(since)
  const toArtist = mails.find((m) => m.includes('Subject: New enquiry'))
  const toVisitor = mails.find((m) => /^To: ananya@example.com$/m.test(m))
  check('artist email sent with Reply-To the visitor', !!toArtist && toArtist.includes('Reply-To: ananya@example.com'))
  check('artist email has the work, price and WhatsApp link', !!toArtist && toArtist.includes('₹1,80,000') && toArtist.includes('wa.me/919848012345'))
  check('visitor auto-reply sent', !!toVisitor && toVisitor.includes('Thank you for asking about Monsoon Grey'))
  await sheet.locator('.sheet-close').click()
  await sheet.waitFor({ state: 'detached' })
  check('sheet closes', true)

  // 2. Print: choose a size, then enquire
  await page.goto(`${BASE}${WORK}#prints`)
  const sizeChips = visible(page, '#panel-prints .chip')
  await sizeChips.first().waitFor()
  await sizeChips.nth(1).click()
  const price = await visible(page, '#panel-prints .price').textContent()
  check('print price changes with the size', price === '₹5,500', price)
  await visible(page, '[data-primary-enquire]').first().click()
  await sheet.waitFor()
  check('print enquiry names the size', (await page.inputValue('#enq-message')).includes('A3'))
  await sleep(3200)
  const since2 = Date.now()
  await sheet.locator('button[type=submit]').click() // name and email are remembered on this device
  await sheet.locator('.sent').waitFor()
  await sleep(1500)
  const printMail = (await outboxSince(since2)).find((m) => m.includes('Subject: New enquiry'))
  check('saved details are reused and the print label reaches the email', !!printMail && printMail.includes('A3'))
  await sheet.locator('.sheet-close').click()

  // 3. Spam rules, straight at the API
  const tokenRes = await page.request.get(`${BASE}/api/enquiries/token`)
  const { token } = await tokenRes.json()
  const body = { type: 'general', name: 'Bot', email: 'bot@example.com', message: 'hi', pageUrl: BASE, token }
  let r = await page.request.post(`${BASE}/api/enquiries`, { data: body, headers: { Origin: BASE } })
  check('a send under 3 seconds is quietly dropped', r.status() === 200 && (await r.json()).ref === '')
  await sleep(3100)
  r = await page.request.post(`${BASE}/api/enquiries`, { data: { ...body, website: 'http://spam' }, headers: { Origin: BASE } })
  check('the hidden field drops bots', r.status() === 200 && (await r.json()).ref === '')
  r = await page.request.post(`${BASE}/api/enquiries`, { data: { ...body, message: 'a http://a.com b http://b.com c http://c.com' }, headers: { Origin: BASE } })
  check('more than two links is refused', r.status() === 400)
  r = await page.request.post(`${BASE}/api/enquiries`, { data: { ...body, token: '123.abc' }, headers: { Origin: BASE } })
  check('a forged token is refused', r.status() === 400)
  r = await page.request.post(`${BASE}/api/enquiries`, { data: body, headers: { Origin: 'https://evil.example' } })
  check('another site cannot post', r.status() === 403)
  r = await page.request.post(`${BASE}/api/enquiries`, { data: { ...body, type: 'original', artworkId: 'ffffffffffffffffffffffff' }, headers: { Origin: BASE } })
  check('an unknown work is refused', r.status() === 400)

  // 4. Contact form
  await page.goto(`${BASE}/contact`)
  await page.locator('#c-name').waitFor()
  await page.click('text=Commission')
  await page.fill('#c-name', 'Ravi Kumar')
  await page.fill('#c-email', 'ravi@example.com')
  await page.fill('#c-message', 'A large work for a 3 m wall, in blues.')
  await sleep(3200)
  await page.click('text=Send message')
  await page.locator('.sent').waitFor()
  check('contact form sends a commission enquiry', (await page.locator('.sent').textContent())?.includes('Thank you, Ravi'))

  // 5. Studio inbox shows them, newest first
  await signIn(page)
  await page.goto(`${BASE}/admin/enquiries`)
  await page.locator('.rowi').first().waitFor()
  const names = await page.locator('.rowi .ttl').allTextContents()
  check('inbox lists the new enquiries', names[0]?.includes('Ravi Kumar') && names.some((n) => n.includes('Ananya Rao')), names.slice(0, 3).join(', '))
  await page.locator('.rowi', { hasText: 'Ananya Rao' }).first().locator('a').click()
  await page.getByText('Mark as replied').click()
  await page.locator('.toast', { hasText: 'Marked as replied' }).waitFor()
  check('enquiry can be marked as replied', true)

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) {
  check('enquiry flow ran without exceptions', false, String(e).slice(0, 400))
} finally {
  await browser.close()
}

// 6. Viewer with a mouse (desktop): click to zoom, drag to pan, Escape to close
const desk = await launch({ mobile: false })
try {
  const p = desk.page
  await p.goto(`${BASE}${WORK}`)
  await visible(p, '.strip-btn').first().click()
  const viewer = p.locator('.viewer')
  await viewer.waitFor()
  await sleep(500)
  const img = viewer.locator('.viewer-slide img').first()
  const b = await img.boundingBox()
  await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await sleep(400)
  check('click zooms in', (await img.evaluate((el) => el.style.transform)).includes('scale(2.2)'))
  const zoomed = await img.evaluate((el) => el.style.transform)
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await p.mouse.down()
  await p.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 60, { steps: 8 })
  await p.mouse.up()
  await sleep(400)
  check('drag pans the zoomed image', (await img.evaluate((el) => el.style.transform)) !== zoomed && (await img.evaluate((el) => el.style.transform)).includes('scale(2.2)'))
  await p.keyboard.press('ArrowRight')
  await sleep(400)
  check('arrow key goes to the next image', (await viewer.locator('.viewer-ui.top .meta').textContent())?.startsWith('2 /'))
  await p.keyboard.press('Escape')
  await viewer.waitFor({ state: 'detached' })
  check('Escape closes the viewer', true)
  check('no page errors (desktop)', desk.errors.length === 0, desk.errors.slice(0, 3).join(' | '))
} catch (e) {
  check('viewer flow ran without exceptions', false, String(e).slice(0, 400))
} finally {
  await desk.browser.close()
  done()
}
