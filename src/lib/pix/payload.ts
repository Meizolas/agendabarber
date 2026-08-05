function onlyAscii(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '')
}

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'

export function normalizePixKey(value: string, type: PixKeyType = 'phone') {
  const raw = value.trim()
  if (!raw) return ''

  const digits = raw.replace(/\D/g, '')
  if (type === 'cpf' || type === 'cnpj') return digits
  if (type === 'email') return raw.toLowerCase()
  if (type === 'phone') {
    if (raw.startsWith('+')) return `+${digits}`
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+${digits}`
    return `+55${digits}`
  }

  return onlyAscii(raw)
}

function tlv(id: string, value: string) {
  const size = String(value.length).padStart(2, '0')
  return `${id}${size}${value}`
}

function crc16(payload: string) {
  let crc = 0xffff
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function buildPixPayload({
  pixKey,
  pixKeyType = 'phone',
  merchantName,
  merchantCity = 'BRASIL',
  amount,
  txid,
  description,
}: {
  pixKey: string
  pixKeyType?: PixKeyType
  merchantName: string
  merchantCity?: string
  amount?: number
  txid?: string
  description?: string
}) {
  const key = normalizePixKey(pixKey, pixKeyType)
  if (!key) return ''

  const merchantAccount = [
    tlv('00', 'br.gov.bcb.pix'),
    tlv('01', key),
    description ? tlv('02', onlyAscii(description).slice(0, 72)) : '',
  ].join('')

  const normalizedTxid = onlyAscii(txid || 'AGENDABARBER').replace(/[^A-Z0-9]/gi, '').slice(0, 25) || 'AGENDABARBER'
  const payload = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    amount && amount > 0 ? tlv('54', amount.toFixed(2)) : '',
    tlv('58', 'BR'),
    tlv('59', onlyAscii(merchantName).toUpperCase().slice(0, 25) || 'BARBEARIA'),
    tlv('60', onlyAscii(merchantCity).toUpperCase().slice(0, 15) || 'BRASIL'),
    tlv('62', tlv('05', normalizedTxid)),
  ].join('')
  const payloadWithCrcId = `${payload}6304`
  return `${payloadWithCrcId}${crc16(payloadWithCrcId)}`
}
