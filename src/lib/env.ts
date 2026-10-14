// Server-side settings read from the environment. See .env.example.

function read(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim()
}

function secret(name: string): string {
  const value = read(name)
  if (value.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set to at least 32 characters`)
  }
  return value || `dev-only-${name}-not-for-production-use-000000`
}

export const env = {
  siteUrl: read('SITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  mongoUri: read('MONGODB_URI', 'mongodb://127.0.0.1:27018/shilpee'),
  sessionSecret: () => secret('SESSION_SECRET'),
  formSecret: () => secret('FORM_SECRET'),
  cronSecret: () => read('CRON_SECRET'),
  adminEmails: () =>
    read('ADMIN_EMAILS')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  storageDriver: read('STORAGE_DRIVER', 'local') as 'local' | 's3',
  storageDir: read('STORAGE_DIR', './storage'),
  s3Region: read('S3_REGION', 'ap-south-1'),
  s3PublicBucket: read('S3_PUBLIC_BUCKET'),
  s3PrivateBucket: read('S3_PRIVATE_BUCKET'),
  mailDriver: read('MAIL_DRIVER', 'console') as 'console' | 'ses',
  mailFrom: read('MAIL_FROM', 'Shilpee Maitra <studio@example.test>'),
  sesRegion: read('SES_REGION', 'ap-south-1'),
}
