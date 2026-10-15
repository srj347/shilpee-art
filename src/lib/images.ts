// Upload pipeline: one photo in, all public sizes out.
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { variantSizes } from './media'
import { putObject } from './storage'
import type { ArtImage, ImageRole } from './types'

sharp.concurrency(1)

const ACCEPTED = new Set(['jpeg', 'png', 'webp'])
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024
const WALL = { r: 251, g: 251, b: 249 }

export function newImageId(): string {
  return Date.now().toString(36) + randomBytes(5).toString('hex')
}

export class UploadError extends Error {}

export async function processImage(
  input: Buffer,
  opts: { role?: ImageRole; alt?: string; artistName?: string } = {},
): Promise<ArtImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new UploadError('This photo is larger than 30 MB.')
  const meta = await sharp(input, { failOn: 'none' }).metadata()
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new UploadError('Use a JPEG, PNG or WebP photo.')
  }
  const width = meta.autoOrient?.width ?? meta.width
  const height = meta.autoOrient?.height ?? meta.height
  if (!width || !height) throw new UploadError('This photo could not be read.')

  const id = newImageId()
  const name = opts.artistName || 'Shilpee Maitra'
  // sharp drops all metadata (including GPS location) unless asked to keep it.
  const base = sharp(input, { failOn: 'none' })
    .autoOrient()
    .toColourspace('srgb')
    .withIccProfile('srgb')
    .withExif({ IFD0: { Artist: name, Copyright: `© ${name}` } })

  await putObject('private', `masters/${id}.${meta.format === 'jpeg' ? 'jpg' : meta.format}`, input, `image/${meta.format}`)

  for (const v of variantSizes(width, height)) {
    const img = base.clone().resize({ width: v.width, height: v.height, fit: 'fill' })
    const [avif, webp] = await Promise.all([
      img.clone().avif({ quality: 50, effort: 4 }).toBuffer(),
      img.clone().webp({ quality: 78 }).toBuffer(),
    ])
    await putObject('public', `img/${id}/${v.size}.avif`, avif, 'image/avif')
    await putObject('public', `img/${id}/${v.size}.webp`, webp, 'image/webp')
  }

  // Social preview: the whole work on the wall colour, never cropped.
  const inner = await base.clone().resize({ width: 1080, height: 540, fit: 'inside' }).toBuffer()
  const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: WALL } })
    .composite([{ input: inner, gravity: 'centre' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
  await putObject('public', `img/${id}/og.jpg`, og, 'image/jpeg')

  // No colour profile in the tiny preview: it would be most of its bytes.
  const lqipBuf = await sharp(input, { failOn: 'none' }).autoOrient().toColourspace('srgb').resize({ width: 24, height: 24, fit: 'inside' }).webp({ quality: 40 }).toBuffer()
  const { dominant } = await sharp(input).stats()
  const hex = (n: number) => n.toString(16).padStart(2, '0')

  return {
    id,
    role: opts.role ?? 'view',
    alt: opts.alt ?? '',
    width,
    height,
    dominant: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
    onMount: false,
    isDigitalPreview: false,
  }
}
