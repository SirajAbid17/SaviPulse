// supabase/functions/_shared/keyRotator.ts

export type KeyType = 'AI' | 'GROQ' | 'TAVILY'

export function getKeys(type: KeyType): string[] {
  const keys: string[] = []
  for (let i = 1; i <= 6; i++) {
    const k = Deno.env.get(`${type}_KEY_${i}`)
    if (k && k.trim().length > 0) keys.push(k.trim())
  }
  return keys
}

export async function withKeyRotation<T>(
  type: KeyType,
  fn: (key: string, index: number) => Promise<T>,
  shouldRotate: (err: any) => boolean = isQuotaError
): Promise<T> {
  const keys = getKeys(type)

  if (keys.length === 0) {
    throw new Error(
      `No ${type} keys configured. Add ${type}_KEY_1 … ${type}_KEY_6 to secrets.`
    )
  }

  let lastError: any = null

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    try {
      const result = await fn(key, i)
      console.log(`✅ ${type} key #${i + 1} succeeded`)
      return result
    } catch (err: any) {
      lastError = err
      const msg = String(err?.message || err).slice(0, 200)
      console.warn(`⚠️ ${type} key #${i + 1} failed: ${msg}`)

      if (!shouldRotate(err)) throw err
    }
  }

  throw new Error(
    `All ${keys.length} ${type} keys exhausted. Last error: ${
      lastError?.message || 'unknown'
    }`
  )
}

export function isQuotaError(err: any): boolean {
  const msg = String(
    err?.message || err?.error?.message || err || ''
  ).toLowerCase()
  const status = err?.status || err?.statusCode || err?.response?.status

  if (status === 429) return true
  if (status === 401) return true
  if (status === 403) return true
  if (status === 402) return true

  const patterns = [
    'quota', 'rate limit', 'rate_limit', 'ratelimit',
    'too many requests', 'exceeded', 'credit',
    'insufficient', 'billing', 'unauthorized',
    'invalid api key', 'api key not valid', 'expired',
    'resource_exhausted', 'capacity',
  ]
  return patterns.some((p) => msg.includes(p))
}