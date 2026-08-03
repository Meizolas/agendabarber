export async function sendPasswordResetEmail({
  email,
  resetUrl,
  idempotencyKey,
}: {
  email: string
  resetUrl: string
  idempotencyKey: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM
  if (!apiKey || !from) throw new Error('AUTH_EMAIL_NOT_CONFIGURED')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'AgendBarber/1.0',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Redefina sua senha do AgendBarber',
      text: `Recebemos uma solicitacao para redefinir sua senha. Acesse este link em ate 30 minutos: ${resetUrl}\n\nSe voce nao solicitou, ignore este e-mail.`,
    }),
  })

  if (!response.ok) {
    throw new Error(`AUTH_EMAIL_SEND_FAILED:${response.status}`)
  }
}
