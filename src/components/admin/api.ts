'use client'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message)
  }
}

/** JSON fetch for Studio. Sends the user to sign-in when the session has ended. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('No connection. Check the internet and try again.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    window.location.replace(new URL('/admin/sign-in', window.location.origin).href)
    throw new ApiError(data.error || 'Sign in again.', 401)
  }
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong.', res.status, data.fieldErrors)
  return data as T
}

/** Upload with progress (fetch cannot report upload progress). */
export function uploadImage(file: File, role: string, onProgress: (p: number) => void): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)
    form.append('role', role)
    xhr.open('POST', '/api/admin/images')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onload = () => {
      let data: { image?: unknown; error?: string } = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status === 401) window.location.replace(new URL('/admin/sign-in', window.location.origin).href)
      if (xhr.status >= 200 && xhr.status < 300 && data.image) resolve(data.image)
      else reject(new ApiError(data.error || 'This photo did not upload. Try again.', xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('No connection. Check the internet and try again.', 0))
    xhr.send(form)
  })
}
