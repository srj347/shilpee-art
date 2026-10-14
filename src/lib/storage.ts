// File storage with two drivers:
//   local: STORAGE_DIR/public/<key> (served by /media) and STORAGE_DIR/private/<key>
//   s3:    S3_PUBLIC_BUCKET (behind CloudFront) and S3_PRIVATE_BUCKET
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from './env'

export type Visibility = 'public' | 'private'

let s3: S3Client | undefined
function client(): S3Client {
  s3 ??= new S3Client({ region: env.s3Region })
  return s3
}

function localPath(visibility: Visibility, key: string): string {
  const root = path.resolve(env.storageDir, visibility)
  const full = path.resolve(root, key)
  if (!full.startsWith(root + path.sep)) throw new Error('Invalid storage key')
  return full
}

export async function putObject(
  visibility: Visibility,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (env.storageDriver === 's3') {
    const bucket = visibility === 'public' ? env.s3PublicBucket : env.s3PrivateBucket
    if (!bucket) throw new Error(`S3 bucket for ${visibility} files is not set`)
    await client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: visibility === 'public' ? 'public, max-age=31536000, immutable' : undefined,
      }),
    )
    return
  }
  const file = localPath(visibility, key)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
}

/** Local driver only: read a public file for the /media route. */
export async function readPublicLocal(key: string): Promise<Buffer | null> {
  try {
    return await readFile(localPath('public', key))
  } catch {
    return null
  }
}
