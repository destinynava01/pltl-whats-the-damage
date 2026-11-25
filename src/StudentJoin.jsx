import { useCallback, useEffect, useRef, useState } from 'react'
import { wdPlay, watchGame } from './api'
import Calculator from './Calculator'
import { clockText, SITE_NAME } from './config'
import { playClosed, playSolved, playWrong } from './sounds'
import { Button, Card, CenterCard, Label, Receipt } from './ui'

const STORAGE_KEY = 'whatsTheDamageStudent'
const DEVICE_KEY = 'whatsTheDamageDevice'
const VARS = ['x', 'y', 'z']
const field = 'w-full rounded-xl border-2 border-line bg-panel px-4 py-3 text-center text-xl font-bold text-ink outline-none focus:border-accent'
const input = 'rounded-lg border-2 border-line bg-white px-2 py-2 text-center font-bold text-ink outline-none focus:border-accent'

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }
const writeSaved = (v) => { try { v ? localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORAGE_KEY) } catch { /* blocked */ } }

// The phone: join, wait for a team, then work through the orders. Everyone sees the receipts; the lead solver (it
// rotates every step) types the answer.
export default function StudentJoin() {
  const [saved, setSaved] = useState(readSaved)
  const [notice, setNotice] = useState('')
  const leave = useCallback((message = '') => { writeSaved(null); setSaved(null); setNotice(message) }, [])
  return saved ? <Room saved={saved} onLeave={leave} /> : <JoinForm notice={notice} onJoined={(v) => { writeSaved(v); setSaved(v); setNotice('') }} />
}

function JoinForm({ onJoined, notice }) {
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('code') ?? '').toUpperCase())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function join(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const d = await wdPlay({ action: 'join', join_code: code, display_name: name, device_id: deviceId() })
      onJoined({ playerId: d.player.id, gameId: d.game.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <CenterCard title={SITE_NAME}>
      <p className="mt-2 text-muted">Hop in the truck. The menu&apos;s missing!</p>
      <form onSubmit={join} className="mt-4 space-y-4">
        {notice && <p className="font-bold text-muted">{notice}</p>}
        <div>
          <Label>Game code</Label>
          <input className={`${field} mt-2 uppercase tracking-[0.4em]`} maxLength={6} placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <Label>Your name</Label>
          <input className={`${field} mt-2`} maxLength={40} placeholder="Maria G." value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy || code.length < 6 || !name.trim()}>{busy ? 'Clocking in…' : 'Join'}</Button>
        {error && <p className="font-bold text-bad">{error}</p>}
      </form>
    </CenterCard>
  )
}

function Room({ saved, onLeave }) {
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null) // { kind: 'right' | 'wrong' | 'closed' | 'info', text, at }
  const [now, setNow] = useState(() => Date.now())
  const lastEvent = useRef(null)
  const ownPlay = useRef(false)
  const stamp = useRef(0)
  const say = (kind, text) => { stamp.current += 1; setFlash({ kind, text, at: stamp.current }) }

  const check = useCallback(() => wdPlay({ action: 'status', player_id: saved.playerId, device_id: deviceId() })
    .then((d) => {
      if (d.ended) return onLeave('That game has ended. Join another with a new code.')
      const e = d.last_event
      if (e && lastEvent.current && e.at !== lastEvent.current) {
        if (e.kind === 'closed') playClosed()
        else if (e.kind === 'wrong') playWrong()
        else playSolved()
        if (!ownPlay.current && !e.mine) {
          if (e.kind === 'wrong') say('wrong', `🧾 ${e.by}'s answer didn't add up. Check it together.`)
          else if (e.kind === 'closed') say('closed', '🎉 Every order served!')
          else say('right', `✅ ${e.by} got it. Next up!`)
        }
      }
      ownPlay.current = false
      lastEvent.current = e?.at ?? lastEvent.current ?? 'none'
      setView({ ...d, offset: Date.parse(d.server_now) - Date.now() })
      setError('')
    })
    .catch((err) => {
      if (/not found|another phone/i.test(err.message)) return onLeave('You were removed from that game.')
      setError(err.message)
    }), [saved, onLeave])

  useEffect(() => {
    check()
    return watchGame(saved.gameId, ['state', 'lobby'], check, 5000)
  }, [saved, check])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])

  async function send(action, answer) {
    setBusy(true)
    setError('')
    try {
      ownPlay.current = true
      const r = await wdPlay({ action, player_id: saved.playerId, device_id: deviceId(), step: view.shift.step, answer })
      if (r.closed) say('closed', `🎉 ${r.feedback} Every order served${r.rank ? ` (#${r.rank} to finish)` : ''}!`)
      else if (r.revealed) say('info', `📋 ${r.feedback}`)
      else if (r.correct) say('right', `✅ ${r.feedback} +${r.points}`)
      else say('wrong', `❌ ${r.feedback}${r.can_reveal ? ' (You can ask to see the answer now.)' : ''}`)
      await check()
    } catch (e) {
      ownPlay.current = false
      setError(e.message)
      check()
    } finally {
      setBusy(false)
    }
  }

  if (!view) return <CenterCard title={SITE_NAME}><p className="mt-4 text-muted">{error || 'Connecting…'}</p></CenterCard>
  const { player, teams } = view
  const myTeam = teams[player.team_index]
  const s = view.shift
  const left = view.game.ends_at ? Date.parse(view.game.ends_at) - (now + view.offset) : null
  let body

  if (player.approval_status !== 'approved') body = <Note title="Almost in!" text="Your leader will put you on a team in a moment." />
  else if (view.game.status === 'setup') body = <Note title={`You're on ${myTeam?.name ?? 'a team'}`} text="The truck opens soon. Get your pencil (or the calculator here) ready." />
  else if (!s) body = <Note title="Firing up the grill…" text="" />
  else if (view.game.status === 'finished' || s.finished) {
    body = (
      <Card awning className="text-center">
        {s.finished ? <p className="mt-2"><span className="paid thunk text-3xl">All paid</span></p> : <p className="font-display text-2xl">Time&apos;s up!</p>}
        <p className="mt-4 font-display text-xl">{myTeam?.name}: {s.points} points</p>
        <p className="mt-1 text-muted">{Math.floor(s.solved.length / 2)} of {s.orders} orders served{s.finish_rank ? ` · #${s.finish_rank} to finish` : ''}</p>
      </Card>
    )
  } else {
    const order = s.shift[s.order]
    body = (
      <>
        <OrderTrack s={s} />
        <Task key={s.step} s={s} order={order} lead={view.lead} busy={busy} canReveal={view.can_reveal} onAnswer={(a) => send('answer', a)} onReveal={() => send('reveal')} />
        <Calculator />
        <MenuSoFar s={s} />
      </>
    )
  }

  return (
    <main className="chalk-bg min-h-dvh text-ink">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="chalk truncate text-xl">{player.display_name}</p>
            {myTeam && <p className="text-sm text-chalk/70"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: myTeam.color }} />{myTeam.name}</p>}
          </div>
          <div className="text-right">
            {left !== null && view.game.status === 'playing' && <p className={`font-display text-xl ${left < 120000 ? 'text-accent' : 'text-chalk'}`}>⏱ {clockText(left)}</p>}
            {s && <p className="font-display text-mustard">{s.points} pts</p>}
          </div>
        </header>
        {flash && (
          <p key={flash.at} className={`pop rounded-xl px-4 py-3 font-semibold shadow ${flash.kind === 'wrong' ? 'shake bg-bad-soft text-bad' : flash.kind === 'info' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>{flash.text}</p>
        )}
        {body}
        {error && <p className="rounded-xl bg-card px-3 py-2 text-center font-bold text-bad">{error}</p>}
        <p className="text-center"><button onClick={() => onLeave()} className="text-sm text-chalk/60 hover:text-chalk">Leave game</button></p>
      </div>
    </main>
  )
}

// The order tickets along the top: done, now, and to come
function OrderTrack({ s }) {
  return (
    <ol className="flex flex-wrap gap-1.5">
      {Array.from({ length: s.orders }, (_, k) => (
        <li key={k} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${k < s.order ? 'bg-ok-soft text-ok' : k === s.order ? 'bg-mustard text-ink' : 'bg-white/10 text-chalk/60'}`}>
          {k < s.order ? '✓' : `#${k + 1}`}
        </li>
      ))}
    </ol>
  )
}

// The current step: the receipts and the answer form (prices), or the new order and its total (damage)
function Task({ s, order, lead, busy, canReveal, onAnswer, onReveal }) {
  const isLead = lead?.me
  const [asSystem, setAsSystem] = useState(false)
  return (
    <Card awning>
      <Label>Order {s.order + 1} of {s.orders} · {order.truck}</Label>
      <h2 className="mt-1 font-display text-2xl">{s.kind === 'prices' ? 'Find the prices' : "What's the damage?"}</h2>

      {s.kind === 'prices' ? (
        <>
          <p className="mt-1 text-sm text-muted">The menu board got wiped. These old receipts are all that&apos;s left. Every item has one price; solve for all {order.items.length}.</p>
          <div className="mt-3 space-y-3">
            {order.receipts.map((rc) => <Receipt key={rc.number} number={rc.number} items={order.items} qty={rc.qty} total={rc.total} />)}
          </div>
          <button type="button" onClick={() => setAsSystem(!asSystem)} className="mt-3 text-sm font-bold text-info underline">{asSystem ? 'Hide' : 'Show'} it as a system of equations</button>
          {asSystem && (
            <div className="mt-2 rounded-xl bg-board px-4 py-3 font-mono text-chalk">
              <p className="text-xs text-chalk/70">{order.items.map((it, i) => `${VARS[i]} = ${it.name}`).join(' · ')}</p>
              {order.receipts.map((rc) => (
                <p key={rc.number} className="mt-1">{order.items.map((_, i) => (rc.qty[i] ? `${rc.qty[i] === 1 ? '' : rc.qty[i]}${VARS[i]}` : '')).filter(Boolean).join(' + ')} = {rc.total.slice(1)}</p>
              ))}
            </div>
          )}
          <PriceForm order={order} isLead={isLead} busy={busy} onAnswer={onAnswer} />
        </>
      ) : (
        <DamageForm order={order} isLead={isLead} busy={busy} onAnswer={onAnswer} />
      )}

      <div className="mt-4 rounded-xl bg-panel px-3 py-2 text-sm">
        {isLead
          ? <p className="font-bold text-accent">🧑‍🍳 You&apos;re the lead solver for this step. Work it out with your team, then type the answer.</p>
          : <p>🧑‍🍳 <b>{lead?.name ?? 'Your teammate'}</b> is the lead solver for this step. Help out loud and check the math!</p>}
        {s.misses > 0 && <p className="mt-1 text-bad">{s.misses} wrong tr{s.misses === 1 ? 'y' : 'ies'} on this step (each costs a quarter of its points).</p>}
      </div>
      {isLead && canReveal && (
        <button type="button" disabled={busy} onClick={() => window.confirm('Show the answer? This step scores 0, but your team moves on.') && onReveal()} className="mt-3 w-full text-sm font-bold text-warn underline">
          Stuck? Show us the answer (0 points for this step)
        </button>
      )}
    </Card>
  )
}

function PriceForm({ order, isLead, busy, onAnswer }) {
  const [prices, setPrices] = useState(() => order.items.map(() => ''))
  const ready = prices.every((p) => /^\$?\d*\.?\d+$/.test(p.trim()))
  return (
    <div className="mt-4 space-y-2">
      {order.items.map((it, i) => (
        <label key={it.id} className="flex items-center gap-2 font-bold">
          <span className="w-36 shrink-0">{it.emoji} {it.name}</span>
          <span className="text-muted">$</span>
          <input className={`${input} flex-1`} inputMode="decimal" placeholder="0.00" disabled={!isLead || busy} value={prices[i]}
            onChange={(e) => setPrices(prices.map((x, k) => (k === i ? e.target.value : x)))} aria-label={`Price of ${it.name}`} />
        </label>
      ))}
      {isLead && <Button className="mt-2 w-full" disabled={busy || !ready} onClick={() => onAnswer({ prices })}>{busy ? 'Checking the receipts…' : '🧾 Restore the menu'}</Button>}
    </div>
  )
}

function DamageForm({ order, isLead, busy, onAnswer }) {
  const [total, setTotal] = useState('')
  return (
    <div className="mt-2">
      <p className="text-sm text-muted">The menu&apos;s back up. A new customer just ordered:</p>
      <div className="receipt mt-3 rounded-t-md px-4 pt-3 text-sm">
        <p className="text-xs text-muted">NEW ORDER</p>
        <div className="my-1.5 border-t border-dashed border-line" />
        {order.items.map((it, i) => (order.damage.qty[i] ? (
          <p key={it.id} className="flex justify-between"><span>{order.damage.qty[i]} × {it.emoji} {it.name}</span><span className="text-muted">@ {order.prices[i]}</span></p>
        ) : null))}
        <div className="my-1.5 border-t border-dashed border-line" />
        <p className="flex justify-between font-bold"><span>TOTAL</span><span>??</span></p>
      </div>
      <label className="mt-4 flex items-center gap-2 font-bold">The damage: <span className="text-muted">$</span>
        <input className={`${input} flex-1`} inputMode="decimal" placeholder="0.00" disabled={!isLead || busy} value={total} onChange={(e) => setTotal(e.target.value)} />
      </label>
      {isLead && <Button className="mt-3 w-full" disabled={busy || !/^\$?\d*\.?\d+$/.test(total.trim())} onClick={() => onAnswer({ total })}>{busy ? 'Ringing it up…' : '💵 Ring it up'}</Button>}
    </div>
  )
}

// Prices solved in earlier orders (a chalkboard menu)
function MenuSoFar({ s }) {
  const done = s.shift.filter((o) => o.prices)
  if (!done.length) return null
  return (
    <section className="rounded-2xl border-4 border-[#6b4f2a] bg-board p-4 text-chalk shadow-lg">
      <p className="chalk text-xl">Menu so far</p>
      <ul className="mt-2 space-y-1 font-mono text-sm">
        {done.flatMap((o) => o.items.map((it, i) => <li key={`${o.truck}-${it.id}-${i}`} className="flex justify-between"><span>{it.emoji} {it.name}</span><span className="text-mustard">{o.prices[i]}</span></li>))}
      </ul>
      <p className="mt-2 text-xs text-chalk/60">(Each order is a different truck, so prices can change.)</p>
    </section>
  )
}

function Note({ title, text }) {
  return (
    <Card awning className="text-center">
      <h2 className="font-display text-2xl text-accent">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </Card>
  )
}
