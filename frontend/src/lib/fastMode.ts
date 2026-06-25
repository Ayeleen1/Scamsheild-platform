const KEY = 'scamshield_fast_mode'

export function getFastMode(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) === '1'
}

export function setFastMode(on: boolean): void {
  localStorage.setItem(KEY, on ? '1' : '0')
}
