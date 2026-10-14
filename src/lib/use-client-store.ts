'use client'

import { useCallback, useSyncExternalStore } from 'react'

const EVENT = 'sm-local-store'

/** A boolean kept in localStorage, safe for server rendering (false on the server). */
export function useLocalFlag(key: string): [boolean, (v: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb)
    window.addEventListener(EVENT, cb)
    return () => {
      window.removeEventListener('storage', cb)
      window.removeEventListener(EVENT, cb)
    }
  }, [])
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === '1'
      } catch {
        return false
      }
    },
    () => false,
  )
  const set = useCallback(
    (v: boolean) => {
      try {
        localStorage.setItem(key, v ? '1' : '0')
      } catch {}
      window.dispatchEvent(new Event(EVENT))
    },
    [key],
  )
  return [value, set]
}

const noop = () => () => {}

/** The URL hash, '' on the server. */
export function useHash(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('hashchange', cb)
      return () => window.removeEventListener('hashchange', cb)
    },
    () => window.location.hash,
    () => '',
  )
}

/** The current year in the browser; a fixed year on the server. */
export function useYear(serverYear: number): number {
  return useSyncExternalStore(noop, () => new Date().getFullYear(), () => serverYear)
}
