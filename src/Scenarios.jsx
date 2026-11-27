import { useCallback, useEffect, useRef, useState } from 'react'
import { callFunction } from './api'
import { PAGE_BG, SCENARIO_GAME, SITE_NAME } from './config'
import { supabase } from './supabase'
import { useSession } from './useSession'

// Leader scenarios for this game. /scenarios: a leader rewords one kind of generated step (tapping slot buttons to
// drop in {slots} the game fills with each team's own generated content) or writes a question of their own, with a
// live preview filled with fresh generated content. /review: reviewers sign in with their @utrgv.edu email and
// approve, edit, reject or retire this game's scenarios. Approved ones are used when the lobby's "Use leader
// scenarios" is on. The same file is in every game with built-in content; it only uses the color names every
// game's theme has, and config.js names the game (SCENARIO_GAME) and the page background (PAGE_BG).

const scenarios = (payload, fallback = 'Could not reach the scenarios service.') => callFunction('scenarios', payload, fallback)
const review = (payload, fallback) => callFunction('review', { ...payload, game: 'jeopardy' }, fallback)
const field = 'w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent'
const labelText = 'mb-1 block text-sm font-bold'
const UTRGV_EMAIL = /^[^@\s]+@utrgv\.edu$/i

function useThisGame() {
  const [game, setGame] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    scenarios({ action: 'catalog' }).then((d) => setGame(d.games.find((g) => g.id === SCENARIO_GAME) ?? null)).catch((e) => setError(e.message))
  }, [])
  return { game, error }
}

const blank = () => ({ round: '', mode: 'reword', step_key: '', title: '', template: '', explain: '', hint: '', course: '', professor: '', answer: { kind: 'number', value: '', choices: ['', ''], correct: 0 } })
function draftFromRow(row) {
  const a = row.answer ?? {}
  return {
    round: row.round, mode: row.mode, step_key: row.step_key ?? '', title: row.title ?? '', template: row.template ?? '', explain: row.explain ?? '', hint: row.hint ?? '',
    course: row.course ?? '', professor: row.professor ?? '', answer: { kind: a.kind ?? 'number', value: a.value ?? '', choices: a.choices ?? ['', ''], correct: a.correct ?? 0 },
  }
}
function payloadOf(d) {
  const answer = d.mode === 'fixed'
    ? (d.answer.kind === 'choice' ? { kind: 'choice', choices: d.answer.choices.map((c) => c.trim()).filter(Boolean), correct: d.answer.correct } : { kind: 'number', value: d.answer.value })
    : null
  return { game: SCENARIO_GAME, round: d.round, mode: d.mode, step_key: d.step_key, title: d.title, template: d.template, explain: d.explain, hint: d.hint, course: d.course, professor: d.professor, answer }
}

function Page({ title, children, wide = true }) {
  return (
    <main className={`${PAGE_BG} min-h-dvh px-4 py-8 text-ink`}>
      <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-md'}`}>
        <a href="/" className="text-sm font-bold text-accent hover:underline">← Back to {SITE_NAME}</a>
        <header className="mb-6 mt-2 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted">{SITE_NAME}</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-accent">{title}</h1>
        </header>
        {children}
      </div>
    </main>
  )
}

// The form, with the live preview beside it
function ScenarioForm({ game, draft, setDraft, children }) {
  const templateRef = useRef(null)
  const set = (patch) => setDraft({ ...draft, ...patch })
  const round = game.rounds.find((r) => r.id === draft.round)
  const step = round?.steps.find((s) => s.key === draft.step_key)
  // Games whose steps have their own layout take reworded steps only; Spike's own questions are multiple choice
  useEffect(() => {
    if (game.fixed === 'none' && draft.mode === 'fixed') setDraft({ ...draft, mode: 'reword' })
    else if (game.fixed === 'choice' && draft.mode === 'fixed' && draft.answer.kind !== 'choice') setDraft({ ...draft, answer: { ...draft.answer, kind: 'choice' } })
  }, [game.fixed, draft, setDraft])
  const insert = (key) => {
    const el = templateRef.current
    const at = el ? el.selectionStart : draft.template.length
    set({ template: `${draft.template.slice(0, at)}{${key}}${draft.template.slice(at)}` })
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = at + key.length + 2 } })
  }
  const setChoice = (i, v) => set({ answer: { ...draft.answer, choices: draft.answer.choices.map((c, k) => (k === i ? v : c)) } })
  const chip = (on) => `rounded-lg border-2 px-3 py-2 text-left ${on ? 'border-accent bg-accent-soft' : 'border-line bg-panel hover:bg-hover'}`
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <label className="block"><span className={labelText}>Round</span>
          <select className={field} value={draft.round} onChange={(e) => set({ round: e.target.value, step_key: '' })}>
            <option value="">Pick a round…</option>
            {game.rounds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        {round && game.fixed !== 'none' && (
          <fieldset>
            <legend className={labelText}>What kind of scenario?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => set({ mode: 'reword' })} className={chip(draft.mode === 'reword')}>
                <span className="block font-bold">🎲 Reword a game step</span><span className="text-xs text-muted">Your story around the game&apos;s own generated numbers and answer.</span>
              </button>
              <button type="button" onClick={() => set({ mode: 'fixed' })} className={chip(draft.mode === 'fixed')}>
                <span className="block font-bold">✍️ My own question</span><span className="text-xs text-muted">A question you write with its answer (no generated numbers){game.fixed === 'choice' ? ': multiple choice in this game' : ''}.</span>
              </button>
            </div>
          </fieldset>
        )}
        {round && draft.mode === 'reword' && (
          <label className="block"><span className={labelText}>The step you&apos;re rewording</span>
            <select className={field} value={draft.step_key} onChange={(e) => set({ step_key: e.target.value })}>
              <option value="">Pick a step…</option>
              {round.steps.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        )}
        {round && (draft.mode === 'fixed' || step) && (
          <>
            <label className="block"><span className={labelText}>Title <span className="font-normal text-muted">(optional)</span></span>
              <input className={field} value={draft.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <div>
              <label className={labelText} htmlFor="scenario-template">The scenario</label>
              {draft.mode === 'reword' && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {step.slots.length === 0 && <span className="text-xs text-muted">This step has no slots: your words go with what the game shows (its sketch, tree or structure).</span>}
                  {step.slots.map((s) => (
                    <button key={s.key} type="button" onClick={() => insert(s.key)} title={`Insert {${s.key}}`}
                      className="rounded-full border border-accent bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-accent hover:brightness-110">+ {s.label}</button>
                  ))}
                </div>
              )}
              <textarea id="scenario-template" ref={templateRef} className={`${field} min-h-28`} value={draft.template} maxLength={1500} onChange={(e) => set({ template: e.target.value })}
                placeholder={draft.mode === 'reword' ? 'Tap a slot above to add generated content, then write your story around it.' : 'Write your question.'} />
              {draft.mode === 'reword' && <p className="mt-1 text-xs text-muted">Slots look like {'{parent}'} and are filled with each team&apos;s own content. The game&apos;s answer and checking stay the same.{game.story ? ' In this game your scenario shows as a story card with the step (its own instructions stay).' : ''}</p>}
            </div>
            {draft.mode === 'fixed' && (
              <fieldset className="rounded-lg border border-line p-3">
                <legend className="px-1 text-sm font-bold">The answer</legend>
                <div className="flex gap-2">
                  {[['number', 'A number'], ['choice', 'Multiple choice']].filter(([id]) => game.fixed !== 'choice' || id === 'choice').map(([id, name]) => (
                    <button key={id} type="button" onClick={() => set({ answer: { ...draft.answer, kind: id } })}
                      className={`rounded-md px-3 py-1 text-sm font-bold ${draft.answer.kind === id ? 'bg-accent text-on-accent' : 'bg-panel'}`}>{name}</button>
                  ))}
                </div>
                {draft.answer.kind === 'number' ? (
                  <input className={`${field} mt-2`} value={draft.answer.value} onChange={(e) => set({ answer: { ...draft.answer, value: e.target.value } })} placeholder="Like 3/4, 0.75 or 12" />
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {draft.answer.choices.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="radio" name="correct" checked={draft.answer.correct === i} onChange={() => set({ answer: { ...draft.answer, correct: i } })} aria-label={`Choice ${i + 1} is right`} className="h-4 w-4" />
                        <input className={field} value={c} maxLength={200} onChange={(e) => setChoice(i, e.target.value)} placeholder={`Choice ${i + 1}`} />
                        {draft.answer.choices.length > 2 && <button type="button" aria-label="Remove this choice" className="px-1 text-muted hover:text-bad"
                          onClick={() => set({ answer: { ...draft.answer, choices: draft.answer.choices.filter((_, k) => k !== i), correct: Math.max(0, draft.answer.correct - (i < draft.answer.correct ? 1 : 0)) } })}>✕</button>}
                      </div>
                    ))}
                    {draft.answer.choices.length < 5 && <button type="button" className="text-sm font-bold text-accent" onClick={() => set({ answer: { ...draft.answer, choices: [...draft.answer.choices, ''] } })}>+ Add a choice</button>}
                    <p className="text-xs text-muted">Mark the right choice with the circle.</p>
                  </div>
                )}
              </fieldset>
            )}
            <label className="block"><span className={labelText}>Hint after a wrong try <span className="font-normal text-muted">(optional{draft.mode === 'reword' ? '; the game has its own' : ''})</span></span>
              <input className={field} value={draft.hint} maxLength={400} onChange={(e) => set({ hint: e.target.value })} />
            </label>
            <label className="block"><span className={labelText}>Explanation once it&apos;s solved <span className="font-normal text-muted">(optional{draft.mode === 'reword' ? '; added before the game’s own' : ''})</span></span>
              <input className={field} value={draft.explain} maxLength={800} onChange={(e) => set({ explain: e.target.value })} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label><span className={labelText}>Course <span className="font-normal text-muted">(optional)</span></span><input className={field} value={draft.course} maxLength={80} onChange={(e) => set({ course: e.target.value })} /></label>
              <label><span className={labelText}>Professor <span className="font-normal text-muted">(optional)</span></span><input className={field} value={draft.professor} maxLength={80} onChange={(e) => set({ professor: e.target.value })} /></label>
            </div>
            {children}
          </>
        )}
      </div>
      <LivePreview draft={draft} />
    </div>
  )
}

// The preview: the scenario filled with a fresh generated step, laid out like a phone
function LivePreview({ draft }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [spin, setSpin] = useState(0)
  const payload = JSON.stringify(payloadOf(draft))
  const ready = Boolean(draft.round && (draft.mode === 'fixed' || draft.step_key) && draft.template.trim().length >= 15)
  useEffect(() => {
    if (!ready) return undefined
    const id = setTimeout(() => {
      scenarios({ action: 'preview', ...JSON.parse(payload) }).then((d) => { setPreview(d.preview); setError(d.preview?.error ?? '') }).catch((e) => { setPreview(null); setError(e.message) })
    }, 450)
    return () => clearTimeout(id)
  }, [payload, spin, ready])
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-widest text-accent">📱 Preview</p>
        {draft.mode === 'reword' && <button type="button" onClick={() => setSpin(spin + 1)} className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-bold hover:bg-hover">🎲 New numbers</button>}
      </div>
      <div className="mt-2 rounded-[1.6rem] border-4 border-line bg-card p-3 shadow-2xl">
        {(!ready || !preview || preview.error) && (
          <p className="p-6 text-center text-sm text-muted">{ready && error ? error : ready ? 'Filling in…' : 'Pick the round and step, and write at least a sentence: the preview fills in here.'}</p>
        )}
        {ready && preview && !preview.error && (
          <div className="space-y-2 text-sm">
            <p className="text-lg font-bold text-accent">{preview.title}</p>
            {preview.visual && <p className="rounded-lg border border-dashed border-line px-2 py-3 text-center text-xs text-muted">({preview.visual} shows here)</p>}
            <p className="font-semibold">{preview.prompt}</p>
            <div className="rounded-lg bg-ok-soft px-2 py-1.5 text-ok"><b>Answer:</b> {preview.answer || '—'}</div>
            {preview.hint && <p className="text-xs text-warn"><b>Hint:</b> {preview.hint}</p>}
            {preview.explain && <p className="text-xs text-muted"><b>After it&apos;s solved:</b> {preview.explain}</p>}
            {preview.original && <details className="text-xs text-muted"><summary className="cursor-pointer">The game&apos;s own wording</summary><p className="mt-1">{preview.original}</p></details>}
          </div>
        )}
      </div>
      {draft.mode === 'reword' && <p className="mt-2 text-xs text-muted">Every team gets different numbers; 🎲 shows another set.</p>}
    </aside>
  )
}

// /scenarios: write a scenario and send it for review
export default function ScenarioSubmit() {
  const { game, error } = useThisGame()
  // "Reword this step" on the review page opens the form on that round and step
  const [draft, setDraft] = useState(() => {
    const q = new URLSearchParams(window.location.search)
    return { ...blank(), round: q.get('round') ?? '', step_key: q.get('step') ?? '' }
  })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [problem, setProblem] = useState('')
  async function send() {
    setBusy(true); setProblem(''); setMessage('')
    try {
      const d = await scenarios({ action: 'submit', ...payloadOf(draft), submitter_name: name })
      setMessage(`${d.message}${d.similar ? ' (A reviewer will check it against a similar one already sent.)' : ''}`)
      setDraft(blank())
    } catch (e) { setProblem(e.message) } finally { setBusy(false) }
  }
  return (
    <Page title="Write a scenario">
      <p className="mx-auto -mt-3 mb-6 max-w-2xl text-center text-muted">
        Give a game step your own story (the game fills in fresh numbers for every team), or write a question of your own. A reviewer approves it,
        and leaders can turn on &quot;Use leader scenarios&quot; in the lobby. <a href="/review" className="font-bold text-accent hover:underline">Reviewers: approve scenarios here.</a>
      </p>
      {error && <p className="text-center text-bad">{error}</p>}
      {!game && !error && <p className="text-center text-muted">Loading…</p>}
      {game && (
        <section className="paper border border-line bg-card rounded-2xl p-5">
          <ScenarioForm game={game} draft={draft} setDraft={setDraft}>
            <label className="block"><span className={labelText}>Your name</span>
              <input className={field} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </label>
            <button type="button" disabled={busy || !name.trim()} onClick={send}
              className="w-full rounded-xl bg-accent px-4 py-3 text-lg font-bold text-on-accent hover:brightness-110 disabled:opacity-40">{busy ? 'Sending…' : 'Send for review'}</button>
            {message && <p className="rounded-lg bg-ok-soft px-3 py-2 font-bold text-ok">{message}</p>}
            {problem && <p className="rounded-lg bg-bad-soft px-3 py-2 font-bold text-bad">{problem}</p>}
          </ScenarioForm>
        </section>
      )}
    </Page>
  )
}

// /review: reviewers sign in, then approve, edit, reject or retire this game's scenarios
export function ScenarioReviewPage() {
  const session = useSession()
  if (session === undefined) return <Page title="Scenario review" wide={false}><p className="text-center text-muted">Checking…</p></Page>
  return session ? <ReviewList email={session.user.email} /> : <SignIn />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function sendLink(event) {
    event.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!UTRGV_EMAIL.test(clean)) return setError('Use your @utrgv.edu email address.')
    setBusy(true)
    try {
      const access = await callFunction('review-access', { email: clean }, 'Could not check your reviewer access.')
      if (!access.authorized) { setBusy(false); return setError('This email is not authorized to review. Ask the supervisor to add it.') }
    } catch (e) { setBusy(false); return setError(e.message) }
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: clean, options: { emailRedirectTo: `${window.location.origin}/review` } })
    setBusy(false)
    if (sendError) return setError(sendError.message)
    setEmail(clean)
    setSent(true)
  }
  async function verifyCode(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (verifyError) setError(verifyError.message)
  }
  return (
    <Page title="Scenario review" wide={false}>
      <section className="paper border border-line bg-card rounded-2xl p-6">
        {!sent ? (
          <form onSubmit={sendLink} className="space-y-4">
            <p className="text-center text-muted">Reviewers sign in with their UTRGV email (the same reviewers as the question review). We&apos;ll email a sign-in link, so there&apos;s no password.</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@utrgv.edu" aria-label="Your UTRGV email" required className={field} />
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent disabled:opacity-40">{busy ? 'Checking…' : 'Email me a sign-in link'}</button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-center">Check <b className="text-accent">{email}</b> and click the sign-in link.</p>
            <p className="text-center text-sm text-muted">Opened it on another device? Enter the code from the email instead:</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" aria-label="The code from the email" className={`${field} text-center tracking-[0.4em]`} />
            <button type="submit" disabled={busy || code.trim().length < 6} className="w-full rounded-xl bg-accent px-4 py-3 font-bold text-on-accent disabled:opacity-40">{busy ? 'Checking…' : 'Sign in with the code'}</button>
          </form>
        )}
        {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm font-bold text-bad">{error}</p>}
      </section>
    </Page>
  )
}

function ReviewList({ email }) {
  const { game, error: catalogError } = useThisGame()
  const [status, setStatus] = useState('pending')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const done = useCallback(() => setReload((n) => n + 1), [])
  useEffect(() => {
    if (status === 'builtin') return
    review({ action: 'list_scenarios', status }, 'Could not load scenarios.')
      .then((d) => { setRows(d.scenarios.filter((r) => r.game === SCENARIO_GAME)); setError('') })
      .catch((e) => setError(e.message))
  }, [status, reload])
  return (
    <Page title="Scenario review">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {['pending', 'approved', 'rejected', 'retired'].map((st) => (
            <button key={st} type="button" onClick={() => setStatus(st)} className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${status === st ? 'bg-accent text-on-accent' : 'bg-panel hover:bg-hover'}`}>{st}</button>
          ))}
          <button type="button" onClick={() => setStatus('builtin')} className={`rounded-full px-3 py-1 text-sm font-bold ${status === 'builtin' ? 'bg-accent text-on-accent' : 'bg-panel hover:bg-hover'}`}>⚙️ Built in</button>
        </div>
        <p className="text-sm text-muted">{email} · <button type="button" onClick={() => supabase.auth.signOut()} className="font-bold text-accent">Sign out</button> · <a href="/scenarios" className="font-bold text-accent">Write one</a></p>
      </div>
      {status === 'builtin' ? <BuiltIn /> : (
        <>
          {(error || catalogError) && <p className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{error || catalogError}</p>}
          {!rows && !error && <p className="text-muted">Loading…</p>}
          {rows?.length === 0 && <p className="paper border border-line bg-card rounded-xl p-4 text-muted">Nothing {status} right now.</p>}
          <div className="space-y-4">{game && rows?.map((row) => <ScenarioCard key={row.id} row={row} game={game} onDone={done} />)}</div>
        </>
      )}
    </Page>
  )
}

// The game's own content: a freshly generated example of every kind of step, round by round. Every game makes new
// numbers each time, so 🎲 shows another example; "Reword it" opens the scenario form on that step.
function BuiltIn() {
  const [rounds, setRounds] = useState(null)
  const [error, setError] = useState('')
  const [spin, setSpin] = useState(0)
  useEffect(() => {
    scenarios({ action: 'samples', game: SCENARIO_GAME }).then((d) => { setRounds(d.rounds); setError('') }).catch((e) => setError(e.message))
  }, [spin])
  async function reroll(roundId, key) {
    try {
      const d = await scenarios({ action: 'samples', game: SCENARIO_GAME, round: roundId, step_key: key })
      const fresh = d.rounds[0]?.steps[0]
      if (fresh) setRounds((rs) => rs.map((r) => (r.id !== roundId ? r : { ...r, steps: r.steps.map((s) => (s.key === key ? fresh : s)) })))
    } catch (e) { setError(e.message) }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted">What {SITE_NAME} already makes on its own: one example of every kind of step, with fresh numbers each time. Nothing here needs approving. Spot something wrong? Use &quot;Report a problem&quot; during a game, or write a scenario that rewords it.</p>
        <button type="button" onClick={() => setSpin(spin + 1)} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-bold hover:bg-hover">🎲 New examples</button>
      </div>
      {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{error}</p>}
      {!rounds && !error && <p className="text-muted">Generating…</p>}
      {rounds?.map((r) => (
        <section key={r.id}>
          <h2 className="mb-2 font-display text-2xl font-bold text-accent">{r.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {r.steps.map((s) => (
              <article key={s.key} className="paper border border-line bg-card space-y-2 rounded-xl p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{s.label}</p>
                  <button type="button" onClick={() => reroll(r.id, s.key)} title="Another example" className="shrink-0 rounded-md border border-line bg-panel px-2 py-0.5 text-xs font-bold hover:bg-hover">🎲</button>
                </div>
                {s.error ? <p className="text-bad">{s.error}</p> : (
                  <>
                    <p className="text-base font-bold">{s.title}</p>
                    {s.visual && <p className="rounded-lg border border-dashed border-line px-2 py-2 text-center text-xs text-muted">({s.visual} shows here)</p>}
                    <p className="whitespace-pre-wrap">{s.prompt}</p>
                    <div className="rounded-lg bg-ok-soft px-2 py-1.5 text-ok"><b>Answer:</b> {s.answer || '—'}</div>
                    {s.hint && <p className="text-xs text-warn"><b>Hint:</b> {s.hint}</p>}
                    {s.explain && <p className="text-xs text-muted"><b>After it&apos;s solved:</b> {s.explain}</p>}
                  </>
                )}
                <a href={`/scenarios?round=${encodeURIComponent(r.id)}&step=${encodeURIComponent(s.key)}`} className="inline-block text-xs font-bold text-accent hover:underline">✍️ Reword this step</a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function ScenarioCard({ row, game, onDone }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => draftFromRow(row))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const round = game.rounds.find((r) => r.id === row.round)
  const stepLabel = round?.steps.find((s) => s.key === row.step_key)?.label
  async function act(payload, fallback) {
    setBusy(true)
    setError('')
    try { await review({ ...payload, scenario_id: row.id }, fallback); setEditing(false); onDone() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <article className="paper border border-line bg-card space-y-3 rounded-xl p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">{round?.title ?? row.round} <span className="ml-1 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">{row.mode === 'fixed' ? 'their own question' : `rewords: ${stepLabel ?? row.step_key}`}</span></p>
        <span className="text-xs text-muted">By {row.submitter_name}{row.course ? ` · ${row.course}` : ''}{row.professor ? ` · ${row.professor}` : ''} · {new Date(row.created_at).toLocaleDateString()}</span>
      </div>
      {row.similar?.length > 0 && (
        <div className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          <b>⚠️ Reads like {row.similar.length} other{row.similar.length === 1 ? '' : 's'} in this round:</b>
          <ul className="mt-1 list-disc pl-5">{row.similar.map((s) => <li key={s.id}>{s.template} ({s.status})</li>)}</ul>
        </div>
      )}
      {editing ? (
        <ScenarioForm game={game} draft={draft} setDraft={setDraft}>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => act({ action: 'edit_scenario', ...payloadOf(draft) }, 'Could not save.')} className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-50">Save</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(draftFromRow(row)) }} className="rounded-lg bg-panel px-4 py-2 font-bold">Cancel</button>
          </div>
        </ScenarioForm>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-2 text-sm">
            {row.title && <p><b className="text-muted">Title:</b> {row.title}</p>}
            <p className="whitespace-pre-wrap rounded-md bg-panel px-3 py-2">{row.template}</p>
            {row.mode === 'fixed' && row.answer && <p><b className="text-muted">Answer:</b> {row.answer.kind === 'choice' ? row.answer.choices.map((c, i) => (i === row.answer.correct ? `✓ ${c}` : c)).join(' · ') : row.answer.value}</p>}
            {row.hint && <p><b className="text-muted">Hint:</b> {row.hint}</p>}
            {row.explain && <p><b className="text-muted">Explanation:</b> {row.explain}</p>}
            {row.review_note && <p className="text-xs text-muted">Review note: {row.review_note}</p>}
          </div>
          <LivePreview draft={draft} />
        </div>
      )}
      {!editing && (
        <div className="flex flex-wrap items-center gap-2">
          {row.status !== 'approved' && <button type="button" disabled={busy} onClick={() => act({ action: 'approve_scenario' }, 'Could not approve.')} className="rounded-lg bg-ok px-4 py-2 text-sm font-bold text-board disabled:opacity-50">✓ Approve</button>}
          <button type="button" disabled={busy} onClick={() => setEditing(true)} className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-bold hover:bg-hover">Edit</button>
          {row.status === 'pending' && <button type="button" disabled={busy} onClick={() => act({ action: 'reject_scenario', note }, 'Could not reject.')} className="rounded-lg bg-bad-soft px-4 py-2 text-sm font-bold text-bad">Reject</button>}
          {row.status === 'approved' && <button type="button" disabled={busy} onClick={() => act({ action: 'retire_scenario', note }, 'Could not retire.')} className="rounded-lg bg-panel px-4 py-2 text-sm font-bold text-muted">Retire</button>}
          <input className={`${field} min-w-0 flex-1 text-sm`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Note to the leader (optional)" />
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </article>
  )
}
