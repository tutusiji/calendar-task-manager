const PANORAMA_TOKEN_KEY = 'panorama_token'

export function getPanoramaToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PANORAMA_TOKEN_KEY)
}

export function hasPanoramaToken(): boolean {
  return !!getPanoramaToken()
}

export function setPanoramaToken(token: string): void {
  sessionStorage.setItem(PANORAMA_TOKEN_KEY, token)
}

export function clearPanoramaToken(): void {
  sessionStorage.removeItem(PANORAMA_TOKEN_KEY)
}

/**
 * 通过服务端校验超管密码，成功后换取短期 panorama token。
 */
export async function authenticatePanorama(password: string): Promise<void> {
  const response = await fetch('/api/admin/panorama/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || '超管认证失败')
  }

  const token = payload?.data?.token
  if (typeof token !== 'string' || !token) {
    throw new Error('超管认证失败：服务端未返回有效凭证')
  }

  setPanoramaToken(token)
}

/**
 * 带超管凭证的 fetch 封装。凭证失效时清理并回到登录页。
 */
export async function panoramaFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getPanoramaToken()
  const headers = new Headers(init?.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, { ...init, headers })

  if (response.status === 401) {
    clearPanoramaToken()
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return response
}
