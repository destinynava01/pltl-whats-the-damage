// Limiting Suspect sound effects, made with the browser's Web Audio API (no audio files). Browsers allow sound only
// after someone has tapped or clicked the page, which has happened by the time a game is running.

const SOUND_KEY = 'whatsTheDamageSound'
let audio = null

function context() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  if (audio.state === 'suspended') audio.resume().catch(() => {})
  return audio
}

export function soundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== 'off' } catch { return true }
}
export function setSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* storage blocked */ }
}

function tone(ctx, { from, to = from, start = 0, length = 0.2, type = 'sine', volume = 0.15 }) {
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

// A thump of noise (the rubber stamp hitting paper)
function thump(ctx, start = 0, volume = 0.4) {
  const t = ctx.currentTime + start
  const length = 0.12
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  const gain = ctx.createGain()
  gain.gain.value = volume
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start(t)
}

const play = (fn) => () => {
  if (!soundOn()) return
  const ctx = context()
  if (ctx) fn(ctx)
}

// 🔖 A step solved: the stamp comes down
export const playSolved = play((ctx) => { thump(ctx); tone(ctx, { from: 660, start: 0.05, length: 0.18, type: 'triangle', volume: 0.12 }) })
// ❌ A wrong answer: a low "hmm"
export const playWrong = play((ctx) => tone(ctx, { from: 220, to: 160, length: 0.3, type: 'sawtooth', volume: 0.08 }))
// 🎺 Case closed: a mystery-show sting
export const playClosed = play((ctx) => {
  thump(ctx, 0, 0.5)
  ;[392, 466, 587, 784].forEach((f, i) => tone(ctx, { from: f, start: 0.1 + i * 0.12, length: 0.45, type: 'triangle', volume: 0.13 }))
})
