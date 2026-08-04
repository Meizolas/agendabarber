import { Clock3, Sun, Sunset } from 'lucide-react'

interface TimeSelectorProps {
  slots: string[]
  unavailableSlots?: string[]
  selectedTime: string | null
  onSelect: (time: string) => void
  loading?: boolean
}

export function TimeSelector({ slots, unavailableSlots = [], selectedTime, onSelect, loading }: TimeSelectorProps) {
  if (loading) return <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-[#17191C]" />)}</div>

  const allSlots = [...slots, ...unavailableSlots].sort((left, right) => left.localeCompare(right))
  if (!allSlots.length) return <div className="rounded-lg border border-white/10 bg-[#15171A] p-8 text-center"><Clock3 className="mx-auto mb-2 h-8 w-8 text-[#F5C400]" /><p className="text-xs text-[#858A93]">Nenhum horário disponível nesta data</p></div>

  const morning = allSlots.filter((slot) => Number(slot.slice(0, 2)) < 12)
  const afternoon = allSlots.filter((slot) => Number(slot.slice(0, 2)) >= 12)

  return <div className="space-y-5"><Period title="Manhã" icon={Sun} slots={morning} unavailableSlots={unavailableSlots} selected={selectedTime} onSelect={onSelect} /><Period title="Tarde" icon={Sunset} slots={afternoon} unavailableSlots={unavailableSlots} selected={selectedTime} onSelect={onSelect} /></div>
}

function Period({ title, icon: Icon, slots, unavailableSlots, selected, onSelect }: { title: string; icon: React.ComponentType<{ className?: string }>; slots: string[]; unavailableSlots: string[]; selected: string | null; onSelect: (time: string) => void }) {
  if (!slots.length) return null
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 border-b border-white/[0.07] pb-2 text-sm text-[#A2A6AD]"><Icon className="h-5 w-5 text-[#F5C400]" /> {title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((slot) => {
          const active = slot === selected
          const unavailable = unavailableSlots.includes(slot)
          return (
            <button
              key={slot}
              type="button"
              disabled={unavailable}
              aria-label={unavailable ? `${slot} ocupado` : slot}
              onClick={() => onSelect(slot)}
              className={`relative h-12 rounded-lg border text-xs font-medium transition ${unavailable ? 'cursor-not-allowed border-white/[0.06] bg-[#0B0D0F] text-[#555A61] line-through decoration-[#686D74] decoration-1' : active ? 'border-[#F5C400] bg-[#F5C400] text-black shadow-[0_8px_20px_rgba(245,196,0,0.18)]' : 'border-white/15 bg-[#111315] text-[#D7DADE] hover:border-[#F5C400]/45'}`}
            >
              {slot.slice(0, 5)}
              {active && !unavailable && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#F5C400] text-[9px] text-black ring-2 ring-[#080A0C]">✓</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
