export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') || ''
}
