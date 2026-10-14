import { connection } from 'next/server'
import { env } from '@/lib/env'
import { issueFormToken } from '@/lib/spam'

/** A fresh signed token each time the enquiry form opens. */
export async function GET() {
  await connection()
  return Response.json({ token: issueFormToken(env.formSecret()) }, { headers: { 'Cache-Control': 'no-store' } })
}
