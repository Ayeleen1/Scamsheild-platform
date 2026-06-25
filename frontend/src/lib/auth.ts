export function logout(redirectTo = '/') {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('scamshield_token')
    window.location.href = redirectTo
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('scamshield_token')
}
