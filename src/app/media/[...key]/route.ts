// Serves uploaded images in local development (STORAGE_DRIVER=local).
// In production, images come from CloudFront and this route is not used.
import { readPublicLocal } from '@/lib/storage'

const TYPES: Record<string, string> = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg' }

export async function GET(_req: Request, ctx: RouteContext<'/media/[...key]'>) {
  const { key } = await ctx.params
  const path = key.join('/')
  const ext = path.split('.').pop() ?? ''
  if (!/^img\/[a-z0-9]+\/(\d+\.(avif|webp)|og\.jpg)$/.test(path)) {
    return new Response('Not found', { status: 404 })
  }
  const file = await readPublicLocal(path)
  if (!file) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(file), {
    headers: { 'Content-Type': TYPES[ext], 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
