import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { wdGame, watchGame } from './api'
import { DURATIONS, HUB_URL, MAX_TEAMS, MIN_TEAMS, MODES, ORDER_COUNTS, SITE_NAME, TEAM_COLORS } from './config'
import { saveSession } from './session'
import { Button, Card, Label } from './ui'

const choice = (on) =>
  `rounded-xl border-2 px-3 py-2 text-center font-bold transition ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel hover:bg-hover'}`

// Leader lobby: create the game -> teams -> finalize -> unknowns, orders, clock -> start. Every team gets its own
// generated orders.
// Students join from their phones; the leader puts them on teams. A team of one works.
export default function Lobby({ onStart, onOpenBoard, hasGame, resume, onCloseGame }) {
  const [session, setSession] = useState(resume?.session ?? null)
  const [teamNames, setTeamNames] = useState(resume?.teams?.length ? resume.teams : ['Team 1', 'Team 2'])
  const [finalized, setFinalized] = useState(Boolean(resume?.finalized))
  const [duration, setDuration] = useState(30)
  const [mode, setMode] = useState('mix')
  const [orderCount, setOrderCount] = useState(6)
  const [jumpstart, setJumpstart] = useState(false) // Jumpstart mode (the corequisite sections)
  const [players, setPlayers] = useState([])
  const [busy, setBusy] = useState(false)
  const [guide, setGuide] = useState(false) // the how-to guide, shown when Start is pressed (before the clock starts)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return undefined
    const load = () => wdGame({ action: 'list_players', game_id: session.gameId, host_token: session.hostToken }).then((d) => setPlayers(d.players)).catch(() => {})
    load()
    return watchGame(session.gameId, ['lobby'], load, 10000)
  }, [session])

  const call = (payload) => wdGame({ ...payload, game_id: session.gameId, host_token: session.hostToken })
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const teamLabel = (i) => teamNames[i].trim() || `Team ${i + 1}`
  const waiting = players.filter((p) => p.approval_status === 'pending')
  const sizes = teamNames.map((_, i) => players.filter((p) => p.approval_status === 'approved' && p.team_index === i).length)
  const emptyTeams = teamNames.map((_, i) => i).filter((i) => sizes[i] === 0)

  const create = () => run(async () => {
    const d = await wdGame({ action: 'create_game' })
    const s = { gameId: d.game.id, hostToken: d.host_token, joinCode: d.game.join_code }
    saveSession(s)
    setSession(s)
  })
  const finalize = () => run(async () => { await call({ action: 'set_teams', team_names: teamNames.map((_, i) => teamLabel(i)) }); setFinalized(true) })
  const studentAction = (payload) => run(async () => { await call(payload); setPlayers((await call({ action: 'list_players' })).players) })
  const start = () => run(async () => {
    await call({ action: 'start_game', team_names: teamNames.map((_, i) => teamLabel(i)), duration_min: duration, mode, order_count: orderCount, jumpstart })
    onStart(session)
  })

  const joinUrl = session ? `${window.location.origin}/join?code=${session.joinCode}` : ''

  return (
    <main className="chalk-bg min-h-dvh p-4 text-ink sm:p-8">
      {/* Start shows the how-to guide first; the game (and its clock) starts when it closes */}
      {guide && <HowToPlay site="whatsthedamage" gameId={session?.gameId ?? 'lobby'} name={SITE_NAME} accent="#e4572e" slides={HOW_TO_SLIDES} open onClose={() => { setGuide(false); start() }} />}
      {hasGame && <button onClick={onOpenBoard} className="fixed right-4 top-4 z-20 rounded-xl border-2 border-line bg-card px-4 py-2 font-display hover:bg-hover">Back to the truck</button>}

      <header className="mx-auto mb-10 max-w-5xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-mustard">{SITE_NAME}</p>
        <h1 className="chalk mt-2 text-5xl">Leader Lobby</h1>
        <p className="mt-2 text-chalk/80">Set up the teams, pick the orders, then open the window.</p>
        <p className="mt-2 text-sm font-bold">
          <a href={HUB_URL} className="text-mustard hover:underline">← All games</a>
        </p>
        <div className="mt-6">
          {session ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-display text-xl text-mustard">Game ready!</p>
              <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={busy} onClick={() => window.confirm('Close this game? Every student will be sent back to the join page.') && onCloseGame()}>Close game and start fresh</Button>
            </div>
          ) : <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create new game'}</Button>}
          {error && <p className="mt-3 rounded-xl bg-card px-3 py-2 font-bold text-bad">{error}</p>}
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <Card awning>
          <h2 className="font-display text-2xl text-accent">Join</h2>
          <p className="mt-3">Join code: {session ? <span className="font-display text-3xl tracking-widest text-accent">{session.joinCode}</span> : <span className="text-muted">Not created yet</span>}</p>
          {session && (
            <div className="mt-5 flex flex-col items-center">
              <div className="rounded-xl bg-white p-4 shadow"><QRCodeSVG value={joinUrl} size={200} title={`Join code ${session.joinCode}`} /></div>
              <p className="mt-3 text-center text-sm text-muted">Students scan this with their phone camera to join.</p>
              <p className="mt-3 rounded-lg border-2 border-dashed border-warn bg-warn-soft px-3 py-2 text-center text-sm font-bold text-warn">📝 Tell students to grab scratch paper for solving the systems of equations.</p>
            </div>
          )}
          <div className="mt-6 rounded-xl border-2 border-dashed border-line p-4 text-sm">
            <p className="font-display text-base">How an order works</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5">
              <li><b>The prices.</b> <span className="text-muted">The truck lost its menu. Old receipts (&ldquo;2 🌮 + 1 🥤 = $8.50&rdquo;) make a system of equations: solve for every item&apos;s price.</span></li>
              <li><b>The damage.</b> <span className="text-muted">A new customer orders. With those prices, what&apos;s their total?</span></li>
            </ol>
            <p className="mt-2 text-muted">Every team gets its own orders, so no copying. One <b className="text-ink">lead solver</b> types each answer; the role rotates every step.</p>
          </div>
        </Card>

        <Card awning>
          <h2 className="font-display text-2xl text-accent">Teams</h2>
          <div className="mt-4 space-y-2">
            {teamNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3 overflow-hidden rounded-xl border-2 border-line bg-panel">
                <span className="w-2 self-stretch" style={{ background: TEAM_COLORS[i] }} aria-hidden="true" />
                <input className="min-w-0 flex-1 bg-transparent py-2.5 font-display text-lg outline-none" value={name} maxLength={40} disabled={finalized}
                  aria-label={`Name for team ${i + 1}`} onChange={(e) => setTeamNames(teamNames.map((n, k) => (k === i ? e.target.value : n)))} />
                {finalized && <span className="pr-3 text-sm text-muted">{sizes[i]} student{sizes[i] === 1 ? '' : 's'}</span>}
                {!finalized && teamNames.length > MIN_TEAMS && (
                  <button type="button" onClick={() => setTeamNames(teamNames.filter((_, k) => k !== i))} aria-label={`Remove team ${i + 1}`} className="mr-3 px-2 text-muted hover:text-bad">✕</button>
                )}
              </div>
            ))}
          </div>
          {!finalized && teamNames.length < MAX_TEAMS && <Button variant="outline" className="mt-3 w-full" onClick={() => setTeamNames([...teamNames, `Team ${teamNames.length + 1}`])}>+ Add team ({teamNames.length}/{MAX_TEAMS})</Button>}
          <p className="mt-2 text-xs text-muted">Teams of 2 to 4 work best. Every team needs at least one student.</p>
          <Button className="mt-4 w-full" disabled={!session || finalized || busy} onClick={finalize}>{finalized ? 'Teams finalized' : 'Finalize teams'}</Button>
          {finalized && <button type="button" className="mt-2 text-sm font-bold text-accent" onClick={() => setFinalized(false)}>Edit teams</button>}

          {finalized && (
            <div className="mt-6 space-y-4 border-t-2 border-dashed border-line pt-4">
              <div>
                <Label>Unknowns per order</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MODES.map((m) => <button key={m.id} type="button" className={choice(mode === m.id)} onClick={() => setMode(m.id)}>{m.name}</button>)}
                </div>
                <p className="mt-1 text-xs text-muted">{MODES.find((m) => m.id === mode)?.text}</p>
              </div>
              <div>
                <Label>Orders</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {ORDER_COUNTS.map((n) => <button key={n} type="button" className={choice(orderCount === n)} onClick={() => setOrderCount(n)}>{n}</button>)}
                </div>
              </div>
              <div>
                <Label>Jumpstart mode</Label>
                <button type="button" aria-pressed={jumpstart} onClick={() => setJumpstart(!jumpstart)}
                  className={`mt-2 flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${jumpstart ? 'border-info bg-info-soft' : 'border-line bg-panel hover:bg-hover'}`}>
                  <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${jumpstart ? 'justify-end bg-info' : 'justify-start bg-line'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></span>
                  <span className="text-sm">
                    <b>🚀 {jumpstart ? 'On' : 'Off'}</b>
                    <span className="block text-xs text-muted">For Jumpstart sections: friendlier numbers (quantities 1–3, prices in 50¢ steps), a worked first step on every order, a hint after one miss, and &ldquo;show the answer&rdquo; after two.</span>
                  </span>
                </button>
              </div>
              <div>
                <Label>Clock</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => <button key={String(d)} type="button" className={choice(duration === d)} onClick={() => setDuration(d)}>{d ? `${d} min` : 'None'}</button>)}
                </div>
                <p className="mt-1 text-xs text-muted">When time runs out, every team scores what it has solved. With no clock, it ends when every team has served every order (or you end it).</p>
              </div>
              {emptyTeams.length > 0 && <p className="text-sm font-bold text-bad">Every team needs at least one student. Still empty: {emptyTeams.map(teamLabel).join(', ')}.</p>}
              <Button className="w-full" disabled={busy || emptyTeams.length > 0} onClick={() => (duration && !howToSkipped() ? setGuide(true) : start())}>
                {busy ? 'Firing up the grill…' : '🌮 Open the window'}
              </Button>
            </div>
          )}
        </Card>

        <Card className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-accent">Students waiting</h2>
            <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={!finalized || waiting.length === 0 || busy} onClick={() => studentAction({ action: 'assign_random' })}>🎲 Randomly assign teams ({waiting.length})</Button>
          </div>
          {!session && <p className="mt-4 text-muted">Create the game first, then students can join with the code.</p>}
          {session && !finalized && <p className="mt-4 text-muted">Finalize the teams so you can put students on them.</p>}
          {session && players.length === 0 && <p className="mt-4 text-muted">No students have joined yet.</p>}
          {waiting.length > 0 && (
            <ul className="mt-4 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-line bg-panel px-3 py-2">
                  <span className="font-bold">{p.display_name}</span>
                  <span className="flex flex-wrap gap-2">
                    {teamNames.map((_, i) => (
                      <button key={i} type="button" disabled={!finalized || busy} onClick={() => studentAction({ action: 'approve_player', player_id: p.id, team_index: i })}
                        className="rounded-xl px-3 py-1 text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAM_COLORS[i] }}>{teamLabel(i)}</button>
                    ))}
                    <button type="button" disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="rounded-xl border-2 border-line px-3 py-1 text-sm font-bold hover:bg-hover">Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {players.some((p) => p.approval_status === 'approved') && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teamNames.map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border-2 border-line bg-panel">
                  <div className="h-1.5" style={{ background: TEAM_COLORS[i] }} />
                  <div className="p-3">
                    <p className="font-display">{teamLabel(i)}</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {players.filter((p) => p.approval_status === 'approved' && p.team_index === i).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>{p.display_name}</span>
                          <button type="button" aria-label={`Remove ${p.display_name}`} disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="text-xs font-bold text-bad">✕</button>
                        </li>
                      ))}
                      {sizes[i] === 0 && <li className="text-xs font-bold text-bad">Needs a student</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </main>
  )
}

// The leader turned the how-to guide off on this computer ("Don't show this again")
function howToSkipped() {
  try {
    return Boolean(localStorage.getItem('pltlHowToSkip:whatsthedamage'))
  } catch {
    return false
  }
}
