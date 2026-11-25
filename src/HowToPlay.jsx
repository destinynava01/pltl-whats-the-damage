import { useEffect, useState } from 'react'
import { SKIN } from './howToSlides'

// A visual "How to play" guide for the projector, with picture mock-ups of what students will see. Leaders can
// skip it, turn it off on this computer, or reopen it with the "? How to play" button. The same file is in every
// PLTL game site; each game passes its own slides and color, and dresses the guide in its own look with the SKIN
// exported from its howToSlides.jsx (any part left out uses the plain dark look below).
//   site:   a short id for this game ("bakery"), for remembering "don't show again"
//   gameId: the current game, so the guide opens by itself once per game
//   slides: [{ title, text, art }]  (art is JSX)
// Two ways to use it:
//   - On the game screen (default): opens once when the game starts, then stays a "? How to play" button.
//     autoOpen={false} makes it only the button (for games with a running clock), and `note` is shown under the
//     slides (e.g. "The clock keeps running").
//   - Before the game starts: pass `open` and `onClose` (the lobby shows it when Start is pressed and starts the
//     game when it closes, so no clock runs while the class watches).

const PLAIN = {
  backdrop: 'bg-black/80',
  panel: 'rounded-3xl bg-slate-900 text-white shadow-2xl', // the guide's card
  glow: true, // a ring in the accent color around the card
  label: 'text-sm font-bold uppercase tracking-[0.25em]', // "How to play · Name" (accent colored unless it sets a color)
  skip: 'rounded-full px-3 py-1 text-sm font-bold text-slate-300 hover:bg-white/10',
  art: 'rounded-2xl bg-slate-800/80', // the box the picture sits in
  step: 'text-sm font-bold text-slate-400',
  title: 'text-3xl font-black leading-tight sm:text-4xl',
  text: 'text-lg leading-relaxed text-slate-200',
  footer: 'border-t border-white/10',
  check: 'text-sm text-slate-300',
  back: 'rounded-xl px-4 py-2 font-bold text-slate-200 hover:bg-white/10',
  next: 'rounded-xl px-5 py-2 font-black text-slate-950 hover:brightness-110', // accent background unless it sets one
  dotOff: '#475569',
  launcher: 'rounded-full border border-white/20 bg-slate-900/90 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-slate-800',
}

export default function HowToPlay({ site, gameId, name, accent = '#38bdf8', slides, open: openProp, onClose, autoOpen = true, note = '' }) {
  const skin = { ...PLAIN, ...(SKIN ?? {}) }
  const skipKey = `pltlHowToSkip:${site}`
  const seenKey = `pltlHowToSeen:${site}:${gameId}`
  const controlled = openProp !== undefined
  const [openState, setOpenState] = useState(() => {
    if (controlled || !autoOpen) return false
    try {
      return !localStorage.getItem(skipKey) && !sessionStorage.getItem(seenKey)
    } catch {
      return true
    }
  })
  const open = controlled ? openProp : openState
  const [step, setStep] = useState(0)
  const [neverAgain, setNeverAgain] = useState(false)

  function close() {
    try {
      sessionStorage.setItem(seenKey, '1')
      if (neverAgain) localStorage.setItem(skipKey, '1')
    } catch {
      // storage blocked: the guide just shows again next time
    }
    setStep(0)
    if (controlled) onClose?.()
    else setOpenState(false)
  }

  const last = step === slides.length - 1
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setStep((s) => Math.min(slides.length - 1, s + 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) {
    if (controlled) return null
    return (
      <button type="button" onClick={() => setOpenState(true)} className={`fixed bottom-4 left-4 z-40 ${skin.launcher}`}>
        ? How to play
      </button>
    )
  }

  const slide = slides[step]
  const labelColored = /\btext-(?!xs|sm|base|lg|xl|\d)/.test(skin.label)
  const nextColored = /\bbg-|\btitle-banner\b/.test(skin.next)
  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4 ${skin.backdrop}`} role="dialog" aria-modal="true" aria-label={`How to play ${name}`}>
      <section className={`my-auto w-full max-w-4xl overflow-hidden ${skin.panel}`} style={skin.glow ? { boxShadow: `0 0 0 3px ${accent}55, 0 30px 80px rgb(0 0 0 / 0.6)` } : undefined}>
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          <p className={skin.label} style={labelColored ? undefined : { color: accent }}>How to play · {name}</p>
          <button type="button" onClick={close} className={skin.skip}>{controlled ? 'Skip and start ✕' : 'Skip ✕'}</button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className={`flex min-h-[16rem] items-center justify-center p-5 ${skin.art}`} key={step}>
            {slide.art}
          </div>
          <div>
            <p className={skin.step}>Step {step + 1} of {slides.length}</p>
            <h2 className={`mt-1 ${skin.title}`}>{slide.title}</h2>
            <p className={`mt-3 ${skin.text}`}>{slide.text}</p>
          </div>
        </div>
        {note && <p className="px-6 pb-3 text-sm font-bold" style={{ color: accent }}>{note}</p>}

        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 ${skin.footer}`}>
          <label className={`flex cursor-pointer items-center gap-2 ${skin.check}`}>
            <input type="checkbox" checked={neverAgain} onChange={(e) => setNeverAgain(e.target.checked)} className="h-4 w-4" style={{ accentColor: accent }} />
            Don&apos;t show this again on this computer
          </label>
          <div className="flex items-center gap-2">
            <span className="mr-2 flex gap-1.5" aria-hidden="true">
              {slides.map((_, i) => <span key={i} className="h-2 w-2 rounded-full" style={{ background: i === step ? accent : skin.dotOff }} />)}
            </span>
            <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className={`disabled:opacity-30 ${skin.back}`}>◀ Back</button>
            <button type="button" onClick={() => (last ? close() : setStep(step + 1))} className={skin.next} style={nextColored ? undefined : { background: accent }}>
              {last ? (controlled ? 'Start the game ▶' : "Let's play! ▶") : 'Next ▶'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
