import { useEffect, useState } from 'react'
import { Button, Label, Receipt } from './ui'

const VARS = ['x', 'y', 'z']

// The leader's peek at one team's truck: the step it's on (the receipts, or the new customer's order), the lead
// solver, every answer tried on this step, and how the earlier steps went. The answer stays behind a button, since
// the board is often on the projector. Refreshes whenever the board does (`stamp` changes).
export default function Peek({ call, team, stamp, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [shownFor, setShownFor] = useState(null) // the step the answer was shown for (a new step hides it again)

  useEffect(() => {
    call({ action: 'peek', team_index: team.index }).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message))
  }, [call, team.index, stamp])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const s = data?.shift
  const step = s?.step
  const showAnswer = shownFor !== null && shownFor === step
  const order = s && !s.finished ? s.shift[s.order] : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Peek at ${team.name}`}>
      <section className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="awning" />
        <div className="p-5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label className="!text-accent">👀 Peeking at {team.name}</Label>
              {order && <h2 className="mt-1 font-display text-2xl">Order {s.order + 1} of {s.orders}: {s.kind === 'prices' ? `finding ${order.items.length} prices` : "what's the damage?"}</h2>}
              {s?.finished && <h2 className="mt-1 font-display text-2xl">Every order served</h2>}
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border-2 border-line px-3 py-1 font-bold hover:bg-hover" aria-label="Close">✕</button>
          </div>

          {error && <p className="mt-3 font-bold text-bad">{error}</p>}
          {!data && !error && <p className="mt-4 text-muted">Loading…</p>}

          {s && (
            <>
              {/* How every step has gone so far: P = prices, $ = the damage */}
              <ol className="mt-3 flex flex-wrap gap-1.5">
                {data.history.map((h) => (
                  <li key={h.step} className={`rounded-lg px-2 py-1 text-xs font-bold ${h.solved ? (h.solved.revealed ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok') : h.step === s.step && !s.finished ? 'bg-mustard text-ink' : 'bg-panel text-muted'}`}>
                    #{Math.floor(h.step / 2) + 1}{h.step % 2 === 0 ? ' prices' : ' $'} {h.solved ? (h.solved.revealed ? 'shown' : '✓') : h.step === s.step && !s.finished ? 'now' : ''}{h.wrong ? ` · ${h.wrong}✗` : ''}
                  </li>
                ))}
              </ol>

              {order && (
                <>
                  <div className="mt-4 rounded-xl bg-panel p-3">
                    <Label>What their phones show</Label>
                    {s.kind === 'prices' ? (
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          {order.receipts.map((rc) => <Receipt key={rc.number} number={rc.number} items={order.items} qty={rc.qty} total={rc.total} />)}
                        </div>
                        <div className="self-start rounded-xl bg-board px-4 py-3 font-mono text-sm text-chalk">
                          <p className="text-xs text-chalk/70">{order.items.map((it, i) => `${VARS[i]} = ${it.name}`).join(' · ')}</p>
                          {order.receipts.map((rc) => <p key={rc.number} className="mt-1">{order.items.map((_, i) => (rc.qty[i] ? `${rc.qty[i] === 1 ? '' : rc.qty[i]}${VARS[i]}` : '')).filter(Boolean).join(' + ')} = {rc.total.slice(1)}</p>)}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm">
                        New order: {order.items.map((it, i) => (order.damage.qty[i] ? `${order.damage.qty[i]} × ${it.emoji} ${it.name} @ ${order.prices[i]}` : '')).filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <p className="mt-3 text-sm">🧑‍🍳 Lead solver: <b>{data.lead ?? '…'}</b> · {s.misses ? <span className="font-bold text-bad">{s.misses} wrong tr{s.misses === 1 ? 'y' : 'ies'} on this step</span> : 'no wrong tries on this step yet'}</p>

                  <div className="mt-3">
                    <Label>Their tries on this step</Label>
                    {data.attempts.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing submitted yet.</p> : (
                      <ol className="mt-1 space-y-1">
                        {data.attempts.map((a, i) => (
                          <li key={i} className={`flex items-start gap-2 rounded-lg px-2 py-1 text-sm ${a.correct ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                            <span>{a.correct ? '✓' : '✗'}</span>
                            <span className="min-w-0"><b>{a.by}:</b> <span className="font-mono">{
                              s.kind === 'prices'
                                ? order.items.map((it, k) => `${it.emoji} $${a.answer.prices?.[k] ?? '?'}`).join(', ')
                                : `total $${a.answer.total ?? '?'}`
                            }</span></span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="outline" className="!px-3 !py-1.5 text-sm" onClick={() => setShownFor(showAnswer ? null : step)}>{showAnswer ? 'Hide' : 'Show'} the answer</Button>
                    <span className="text-xs text-muted">(hidden by default in case this is on the projector)</span>
                  </div>
                  {showAnswer && <p className="mt-2 rounded-xl bg-ok-soft px-3 py-2 font-mono text-sm text-ok">{data.answer}</p>}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
