export const SUPPORT_WHATSAPP = '5577988197912'

export function getSupportWhatsAppUrl(message = 'Ola! Preciso de suporte no AgendBarber.') {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`
}
