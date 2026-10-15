// Email with two drivers:
//   console: writes each message to STORAGE_DIR/outbox (development)
//   ses:     Amazon SES v2 (production)
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { env } from './env'

export interface Mail {
  to: string[]
  subject: string
  html: string
  text: string
  replyTo?: string
}

let ses: SESv2Client | undefined

export async function sendMail(mail: Mail): Promise<void> {
  if (!mail.to.length) throw new Error('No recipient')
  if (env.mailDriver === 'ses') {
    ses ??= new SESv2Client({ region: env.sesRegion })
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: env.mailFrom,
        Destination: { ToAddresses: mail.to },
        ReplyToAddresses: mail.replyTo ? [mail.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: { Html: { Data: mail.html, Charset: 'UTF-8' }, Text: { Data: mail.text, Charset: 'UTF-8' } },
          },
        },
      }),
    )
    return
  }
  const dir = path.resolve(env.storageDir, 'outbox')
  await mkdir(dir, { recursive: true })
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${mail.to[0].replace(/[^a-z0-9]/gi, '_')}`
  const head = `From: ${env.mailFrom}\nTo: ${mail.to.join(', ')}\n${mail.replyTo ? `Reply-To: ${mail.replyTo}\n` : ''}Subject: ${mail.subject}\n\n`
  await writeFile(path.join(dir, `${name}.txt`), head + mail.text)
  await writeFile(path.join(dir, `${name}.html`), mail.html)
  console.log(`[mail] ${mail.subject} → ${mail.to.join(', ')} (storage/outbox/${name}.txt)`)
}
