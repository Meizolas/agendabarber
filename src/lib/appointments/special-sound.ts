'use client'

let context: AudioContext | null = null

export async function prepareSpecialSound() {
  if (typeof window === 'undefined') return
  const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor || context?.state === 'running') return
  if (!context || context.state === 'closed') context = new AudioContextConstructor()
  // Preparar durante uma interação permite áudio futuro, sem tocar uma amostra.
  await context.resume()
}

export async function playSpecialSound() {
  if (!context || context.state !== 'running') return
  const start = context.currentTime
  // Pequeno acorde ascendente sintetizado, sem arquivos ou serviços externos.
  ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    const oscillator = context!.createOscillator()
    const gain = context!.createGain()
    const at = start + index * 0.13
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.075, at + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.4)
    oscillator.connect(gain)
    gain.connect(context!.destination)
    oscillator.start(at)
    oscillator.stop(at + 0.42)
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
  })
}
