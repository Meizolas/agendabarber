import { AvailabilityRule } from '@/types'

export function getOpenStatus(rules: AvailabilityRule[], now = new Date()) {
  const today = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todaysRules = rules
    .filter((rule) => rule.is_active && rule.day_of_week === today)
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))

  const activeRule = todaysRules.find((rule) => {
    const start = toMinutes(rule.start_time)
    const end = toMinutes(rule.end_time)
    return currentMinutes >= start && currentMinutes < end
  })

  if (activeRule) {
    return {
      isOpen: true,
      label: `Aberta agora até ${activeRule.end_time.substring(0, 5)}`,
      nextLabel: null,
    }
  }

  const nextRule = findNextRule(rules, now)

  return {
    isOpen: false,
    label: 'Fechada agora',
    nextLabel: nextRule
      ? `Abre ${nextRule.dayLabel} às ${nextRule.rule.start_time.substring(0, 5)}`
      : 'Horários indisponíveis',
  }
}

function findNextRule(rules: AvailabilityRule[], now: Date) {
  const activeRules = rules.filter((rule) => rule.is_active)
  if (activeRules.length === 0) return null

  const today = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (today + offset) % 7
    const dayRules = activeRules
      .filter((rule) => rule.day_of_week === day)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))

    const rule = offset === 0
      ? dayRules.find((item) => toMinutes(item.start_time) > currentMinutes)
      : dayRules[0]

    if (rule) {
      return {
        rule,
        dayLabel: offset === 0 ? 'hoje' : offset === 1 ? 'amanhã' : `em ${offset} dias`,
      }
    }
  }

  return null
}

function toMinutes(time: string) {
  const [hours, minutes] = time.substring(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}
