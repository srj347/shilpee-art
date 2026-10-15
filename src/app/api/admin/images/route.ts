import { assertSameOrigin, handle, HttpError, requireAdmin } from '@/lib/auth'
import { MAX_UPLOAD_BYTES, processImage, UploadError } from '@/lib/images'
import type { ImageRole } from '@/lib/types'

const ROLES: ImageRole[] = ['main', 'view', 'detail', 'room', 'wip']

/** One photo per request: stores the master privately and makes all public sizes. */
export const POST = handle(async (req: Request) => {
  assertSameOrigin(req)
  await requireAdmin()
  const length = Number(req.headers.get('content-length') ?? 0)
  if (length > MAX_UPLOAD_BYTES + 1024 * 1024) throw new HttpError(413, 'This photo is larger than 30 MB.')
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a photo to upload.')
  const role = String(form?.get('role') ?? 'view') as ImageRole
  const alt = String(form?.get('alt') ?? '').slice(0, 300)
  try {
    const image = await processImage(Buffer.from(await file.arrayBuffer()), { role: ROLES.includes(role) ? role : 'view', alt })
    return Response.json({ image }, { status: 201 })
  } catch (err) {
    if (err instanceof UploadError) throw new HttpError(400, err.message)
    throw err
  }
})
