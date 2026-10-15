import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { getSettingsForStudio, saveSettings } from '@/lib/studio'
import type { Settings } from '@/lib/types'
import { fieldErrors, settingsSchema } from '@/lib/validation'

export const GET = handle(async () => {
  await requireAdmin()
  return Response.json({ settings: await getSettingsForStudio() })
})

export const PUT = handle(async (req: Request) => {
  assertSameOrigin(req)
  await requireAdmin()
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) throw new HttpError(400, 'Some fields need attention.', { fieldErrors: fieldErrors(parsed.error) })
  const data = { ...parsed.data, contact: { ...parsed.data.contact, whatsapp: parsed.data.contact.whatsapp.replace(/\D/g, '') } }
  return Response.json({ settings: await saveSettings(data as Settings) })
})
