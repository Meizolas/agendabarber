import { Check } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'

interface SuccessScreenProps {
  clientName: string
  barbershopName: string
  serviceName: string
  date: string
  time: string
  onNewBooking: () => void
}

export function SuccessScreen({
  clientName,
  barbershopName,
  serviceName,
  date,
  time,
  onNewBooking,
}: SuccessScreenProps) {
  const rows = [
    ['Cliente', clientName],
    ['Barbearia', barbershopName],
    ['Servico', serviceName],
    ['Data', formatDate(date)],
    ['Horario', formatTime(time)],
  ]

  return (
    <div className="space-y-7 py-4 text-center">
      <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-[#F4B400]/35 bg-[#F4B400]/10">
        <Check className="h-14 w-14 text-[#F4B400]" />
      </div>

      <div>
        <h2 className="text-[24px] font-semibold text-white">Agendamento confirmado!</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#9CA3AF]">
          Seu horario foi agendado com sucesso. Em breve voce recebera a confirmacao por WhatsApp.
        </p>
      </div>

      <div className="premium-card divide-y divide-white/10 overflow-hidden text-left">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-[#9CA3AF]">{label}</span>
            <span className="text-right font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>

      <Button className="premium-button w-full" onClick={onNewBooking}>
        Voltar ao inicio
      </Button>
    </div>
  )
}
