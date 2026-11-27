import { useEffect, useState } from 'react'

// "🚩 Report a problem": the leader flags a step or question that looks wrong (a wrong answer, a confusing question,
// something drawn wrong). It goes to the review dashboard's "Game reports" tab. The same file is in every PLTL game
// whose content is built in; it only uses the color names every game's theme has.
//   call:     sends a leader action to this game's server (with the game's host token)
//   location: where it happened ("Team 2 · House rules: Formal charge: CS₂")
//   question: what the phones showed     answer: the answer the game expected (sent, not shown here)

const REASONS = [
  { id: 'wrong_answer', text: 'The answer is wrong' },
  { id: 'wrong_explanation', text: 'The explanation is wrong' },
  { id: 'unclear', text: 'The question is unclear' },
  { id: 'typo', text: 'Typo' },
  { id: 'display', text: 'Something looks broken' },
  { id: 'other', text: 'Something else' },
]
const NAME_KEY = 'pltlReporterName'
const savedName = () => { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } }

export default function ReportProblem({ call, location, question = '', answer = '', className = '' }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [name, setName] = useState(savedName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function send() {
    setBusy(true)
    setError('')
    try {
      await call({ action: 'report_problem', location, question, answer, reason, note, reported_by: name })
      try { localStorage.setItem(NAME_KEY, name.trim()) } catch { /* storage blocked */ }
      setSent(true)
    } catch (e) {
      setError(e.message || 'Could not send the report.')
    } finally {
      setBusy(false)
    }
  }
  const close = () => { setOpen(false); if (sent) { setSent(false); setReason(''); setNote('') } }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`text-xs font-bold text-muted underline-offset-2 hover:text-bad hover:underline ${className}`}>
        🚩 Report a problem
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/70 p-4 text-left text-ink" role="dialog" aria-modal="true" aria-label="Report a problem">
          <section className="my-auto w-full max-w-md rounded-xl border border-line bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold">🚩 Report a problem</p>
                <p className="mt-0.5 text-sm text-muted">{location}</p>
              </div>
              <button type="button" onClick={close} className="rounded-md border border-line px-2.5 py-0.5 font-bold hover:bg-hover" aria-label="Close">✕</button>
            </div>
            {sent ? (
              <div className="mt-4">
                <p className="rounded-lg bg-ok-soft px-3 py-2 font-semibold text-ok">Reported. Thank you! A reviewer will take a look.</p>
                <button type="button" onClick={close} className="mt-3 w-full rounded-lg border border-line bg-panel px-4 py-2 font-bold hover:bg-hover">Close</button>
              </div>
            ) : (
              <>
                {question && <p className="mt-3 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-lg bg-panel px-3 py-2 text-sm">{question}</p>}
                <p className="mt-3 text-sm font-bold">What&apos;s wrong?</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {REASONS.map((r) => (
                    <button key={r.id} type="button" onClick={() => setReason(r.id)}
                      className={`rounded-lg border px-2 py-1.5 text-left text-sm font-semibold ${reason === r.id ? 'border-ok bg-ok-soft text-ok' : 'border-line bg-panel hover:bg-hover'}`}>{r.text}</button>
                  ))}
                </div>
                <label className="mt-3 block text-sm font-bold" htmlFor="report-note">Details {reason === 'other' ? '' : <span className="font-normal text-muted">(optional)</span>}</label>
                <textarea id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={3}
                  placeholder="Like: boron only bonds to 3 atoms in our class" className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-ok" />
                <label className="mt-2 block text-sm font-bold" htmlFor="report-name">Your name</label>
                <input id="report-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                  className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-ok" />
                {error && <p className="mt-2 text-sm font-bold text-bad">{error}</p>}
                <button type="button" onClick={send} disabled={busy || !reason || !name.trim() || (reason === 'other' && !note.trim())}
                  className="mt-4 w-full rounded-lg bg-ok px-4 py-2.5 font-bold text-board hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? 'Sending…' : 'Send the report'}
                </button>
                <p className="mt-2 text-xs text-muted">It goes to the reviewers&apos; Game reports list, with the expected answer attached.</p>
              </>
            )}
          </section>
        </div>
      )}
    </>
  )
}
