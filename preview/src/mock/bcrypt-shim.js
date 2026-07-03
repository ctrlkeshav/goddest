// Minimal bcrypt shim for the browser preview.
// Real app uses bcryptjs in Node — this just does a simple hash for UI testing.

const PREFIX = 'HASH:'

export default {
  hash(password) {
    return PREFIX + btoa(password)
  },
  compare(password, hash) {
    if (hash === 'ADMIN123_HASH') return password === 'admin123'
    if (hash?.startsWith(PREFIX)) {
      try { return atob(hash.slice(PREFIX.length)) === password } catch { return false }
    }
    return false
  }
}
