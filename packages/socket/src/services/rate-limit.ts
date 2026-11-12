const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

interface Entry {
  failures: number
  windowStart: number
}

const entries = new Map<string, Entry>()

const current = (key: string): Entry | undefined => {
  const entry = entries.get(key)

  if (entry && Date.now() - entry.windowStart > WINDOW_MS) {
    entries.delete(key)

    return undefined
  }

  return entry
}

export const isLimited = (key: string): boolean =>
  (current(key)?.failures ?? 0) >= MAX_FAILURES

export const recordFailure = (key: string): void => {
  const entry = current(key)

  if (entry) {
    entry.failures += 1

    return
  }

  entries.set(key, { failures: 1, windowStart: Date.now() })
}

export const resetFailures = (key: string): void => {
  entries.delete(key)
}

export const clearRateLimits = (): void => {
  entries.clear()
}
