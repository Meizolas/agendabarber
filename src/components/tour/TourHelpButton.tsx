'use client'

import { CircleHelp } from 'lucide-react'

export function TourHelpButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('agendbarber:start-tour'))}
      aria-label="Iniciar tour pelo aplicativo"
      title="Conhecer o aplicativo"
      className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#111315] text-[#A2A6AD] transition hover:border-[#F5C400]/50 hover:text-[#F5C400]"
    >
      <CircleHelp className="h-[18px] w-[18px]" />
    </button>
  )
}
