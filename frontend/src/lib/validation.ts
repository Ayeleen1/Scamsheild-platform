const EMAIL_RE =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  const e = normalizeEmail(email)
  if (!e) return 'Email is required.'
  if (!EMAIL_RE.test(e)) return 'Enter a valid email like name@gmail.com'
  if (e.includes('..')) return 'Invalid email format.'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter (A-Z).'
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter (a-z).'
  if (!/\d/.test(password)) return 'Add at least one number (0-9).'
  return null
}

export function validateName(name: string): string | null {
  const n = name.trim()
  if (n.length < 2) return 'Name must be at least 2 characters.'
  return null
}
