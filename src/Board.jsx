import { useCallback, useEffect, useRef, useState } from 'react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { wdGame, watchGame } from './api'
import Results from './Results'
import { clockText, MODES, SITE_NAME } from './config'
import { playClosed, playSolved, playWrong, setSoundOn, soundOn } from './sounds'
import { Button } from './ui'

// The projector: a row of food trucks, one per team. Each truck's order tickets get a PAID stamp as the team
// serves them (every team has its own orders, so showing a team's progress can't help another). The clock counts
// down at the top; the game ends when it runs out or every team has served every order.
export default function Board({ session, onLobby, onNewGame }) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sound, setSound] = useState(soundOn)
  const [now, setNow] = useState(() => Date.now())
  const last = useRef(null)

  const call = useCallback((payload) => wdGame({ ...payload, game_id: session.gameId, host_token: session.hostToken }), [session])

  const listen = (d) => {
    const events = new Map(d.teams.map((t) => [t.index, t.last_event ?? null]))
    if (last.current) {
      const kinds = new Set()
      for (const [i, e] of events) if (e && e.at !== last.current.get(i)?.at) kinds.add(e.kind)
      if (kinds.has('closed')) playClosed()
      else if (kinds.has('right') || kinds.has('revealed')) playSolved()
      else if (kinds.has('wrong')) playWrong()
    }
    last.current = events
  }

  const load = useCallback(() => call({ action: 'board' }).then((d) => { listen(d); setBoard({ ...d, offset: Date.parse(d.server_now) - Date.now() }); setError('') }).catch((e) => setError(e.message)), [call])
  useEffect(() => {
    load()
    return watchGame(session.gameId, ['state', 'lobby'], load, 5000)
  }, [session, load])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const left = board?.game.ends_at ? Date.parse(board.game.ends_at) - (now + board.offset) : null
  useEffect(() => { if (left !== null && left <= 0 && board?.game.status === 'playing') load() }, [left, board?.game.status, load])

  async function end() {
    if (!window.confirm('Close the trucks now and see the results?')) return
    setBusy(true)
    try { await call({ action: 'end_game' }); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!board) return <main className="chalk-bg flex min-h-dvh items-center justify-center"><p className="chalk text-2xl">Firing up the grill…</p></main>
  if (board.game.status === 'finished') return <Results session={session} onNewGame={onNewGame} onLobby={onLobby} />
  const serverNow = now + board.offset
  const mode = MODES.find((m) => m.id === board.game.mode)

  return (
    <main className="chalk-bg min-h-dvh p-4 text-ink sm:p-6">
      {/* The visual how-to guide: opens once per game when there's no clock (with a clock, it plays in the lobby) */}
      <HowToPlay site="whatsthedamage" gameId={session.gameId} name={SITE_NAME} accent="#e4572e" slides={HOW_TO_SLIDES} autoOpen={!board.game.ends_at}
        note={board.game.ends_at ? 'The clock keeps running while this is open.' : ''} />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-mustard">join code {session.joinCode}</p>
          <h1 className="chalk mt-1 text-5xl">🌮 {SITE_NAME}</h1>
          <p className="text-sm text-chalk/70">{board.game.orders} orders · {mode?.name}</p>
        </div>
        {left !== null && (
          <div className={`rounded-2xl bg-card px-5 py-2 text-center shadow-lg ${left < 120000 ? 'shake' : ''}`} key={left < 120000 ? Math.floor(left / 10000) : 'clock'}>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">Closing time</p>
            <p className={`font-display text-4xl ${left < 120000 ? 'text-accent' : 'text-info'}`}>{clockText(left)}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {board.waiting > 0 && <Button variant="teal" className="!px-4 !py-2 text-sm" onClick={onLobby}>{board.waiting} waiting to join</Button>}
          <Button variant="outline" className="!px-4 !py-2 text-sm" aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} title={sound ? 'Mute sounds' : 'Turn sounds on'}
            onClick={() => { setSoundOn(!sound); setSound(!sound); if (!sound) playSolved() }}>
            {sound ? '🔊' : '🔇'}
          </Button>
          <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onLobby}>Lobby</Button>
          <Button className="!px-4 !py-2 text-sm" disabled={busy} onClick={end}>End game</Button>
        </div>
      </header>
      {error && <p className="mx-auto mt-3 max-w-7xl rounded-xl bg-card px-3 py-2 font-bold text-bad">{error}</p>}

      <section className={`mx-auto mt-8 grid max-w-7xl gap-6 ${board.teams.length > 1 ? 'md:grid-cols-2' : ''} ${board.teams.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {board.teams.map((t) => <Truck key={t.index} team={t} serverNow={serverNow} />)}
      </section>
    </main>
  )
}

function Truck({ team, serverNow }) {
  const s = team.shift
  if (!s) return null
  const e = team.last_event
  const fresh = e && serverNow - Date.parse(e.at) < 6000
  const medal = ['🥇', '🥈', '🥉']
  const current = s.shift[s.order]
  return (
    <article className={`soft-shadow overflow-hidden rounded-2xl bg-card ${fresh && e.kind === 'wrong' ? 'shake' : ''}`} key={fresh && e.kind === 'wrong' ? e.at : 'truck'}>
      <div className="awning" />
      <div className="flex items-start justify-between gap-3 px-5 pt-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-3xl" style={{ color: team.color }}>{team.name}</h2>
          <p className="truncate text-sm text-muted">{team.members.join(', ')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-accent">{s.points}</p>
          <p className="text-sm text-muted">points</p>
        </div>
      </div>

      {/* The order tickets */}
      <ol className="flex flex-wrap gap-2 px-5 py-3">
        {Array.from({ length: s.orders }, (_, k) => {
          const paid = k < s.order || s.finished
          return (
            <li key={k} className={`relative flex h-14 w-12 flex-col items-center justify-center rounded-md border-2 text-xs font-bold ${paid ? 'border-ok bg-ok-soft' : k === s.order ? 'border-mustard bg-warn-soft' : 'border-dashed border-line bg-panel text-muted'}`}>
              #{k + 1}
              {paid && <span className="paid thunk absolute text-[0.6rem]">PAID</span>}
            </li>
          )
        })}
      </ol>

      <div className="px-5 pb-5">
        {s.finished ? (
          <p className="text-center"><span className="paid thunk text-2xl">{medal[s.finish_rank - 1] ?? ''} All orders served</span></p>
        ) : current && (
          <>
            <p className="text-sm">
              <b>Order {s.order + 1}:</b> {s.kind === 'prices' ? `solving ${current.items.length} prices (${current.items.map((it) => it.emoji).join(' ')})` : 'ringing up the damage'}
            </p>
            <p className="text-sm">🧑‍🍳 Lead solver: <b>{team.lead ?? '…'}</b>{s.misses ? <span className="text-bad"> · {s.misses} wrong tr{s.misses === 1 ? 'y' : 'ies'}</span> : ''}</p>
          </>
        )}
        {fresh && !s.finished && (
          <p className={`pop mt-2 rounded-xl px-3 py-2 text-sm font-semibold ${e.kind === 'wrong' ? 'bg-bad-soft text-bad' : e.kind === 'revealed' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`} key={e.at}>
            {e.kind === 'wrong' && `❌ ${e.by}'s answer didn't add up`}
            {e.kind === 'right' && `✅ ${e.by} got it!`}
            {e.kind === 'revealed' && `📋 ${e.by} asked to see the answer`}
          </p>
        )}
      </div>
    </article>
  )
}
