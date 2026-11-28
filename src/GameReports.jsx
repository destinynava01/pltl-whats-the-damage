import { useCallback, useEffect, useState } from 'react'

// Problems leaders reported from this game (the 🚩 Report a problem link in the peek and the results). Fixing one means
// changing the game's code or content, so this is a to-do list: mark each one fixed once it's handled. Shown on the
// game's own /review page. The same file is in every game with a report link; it only uses the color names every
// game's theme has. call: the signed-in 'review' function; game: this game's report id.
const REASONS = {
  wrong_answer: 'Wrong answer', wrong_explanation: 'Wrong explanation', unclear: 'Unclear question', typo: 'Typo',
  display: 'Looks broken', other: 'Other',
}

export default function GameReports({ call, game }) {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [showFixed, setShowFixed] = useState(false)
  const load = useCallback(() => call({ action: 'list_game_reports', report_game: game }, 'Could not load the reports.')
    .then((d) => { setReports((d.reports ?? []).filter((r) => r.game === game)); setError('') })
    .catch((e) => setError(e.message)), [call, game])
  useEffect(() => { load() }, [load])

  if (error) return <p className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{error}</p>
  if (!reports) return <p className="text-muted">Loading the reports…</p>
  const open = reports.filter((r) => r.status === 'open')
  const fixed = reports.filter((r) => r.status !== 'open')
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">
        Problems leaders flagged with 🚩 Report a problem (from the peek or the results). Fix the game, then mark the
        report fixed.
      </p>
      {open.length === 0 && <p className="rounded-xl border border-line bg-card p-4 text-muted">🎉 No open reports.</p>}
      {open.map((r) => <ReportCard key={r.id} report={r} call={call} onDone={load} />)}
      {fixed.length > 0 && (
        <button type="button" onClick={() => setShowFixed(!showFixed)} className="text-sm font-bold text-accent hover:underline">
          {showFixed ? 'Hide' : 'Show'} fixed reports ({fixed.length})
        </button>
      )}
      {showFixed && fixed.map((r) => <ReportCard key={r.id} report={r} call={call} onDone={load} />)}
    </section>
  )
}

function ReportCard({ report, call, onDone }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isOpen = report.status === 'open'
  async function resolve() {
    setBusy(true)
    setError('')
    try {
      await call({ action: 'resolve_game_report', report_id: report.id, note }, 'Could not mark that fixed.')
      await onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className={`space-y-2 rounded-xl border bg-card p-4 text-sm text-ink ${isOpen ? 'border-accent' : 'border-line opacity-75'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          <span className="rounded-md bg-panel px-2 py-0.5 text-xs font-bold uppercase text-accent">{REASONS[report.reason] ?? report.reason}</span>
          <span className="ml-2">{report.location}</span>
        </p>
        <span className="text-xs text-muted">Reported by {report.reported_by} · {new Date(report.created_at).toLocaleString()}</span>
      </div>
      {report.question && <p className="whitespace-pre-wrap rounded-lg bg-panel px-3 py-2"><b className="text-muted">Question: </b>{report.question}</p>}
      {report.answer && <p className="whitespace-pre-wrap rounded-lg bg-panel px-3 py-2"><b className="text-muted">Expected answer: </b>{report.answer}</p>}
      {report.note && <p className="whitespace-pre-wrap rounded-lg bg-panel px-3 py-2"><b className="text-muted">Leader&apos;s note: </b>{report.note}</p>}
      {isOpen ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="What was fixed (optional)" aria-label="What was fixed"
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-ink outline-none focus:border-accent" />
          <button type="button" disabled={busy} onClick={resolve} className="rounded-lg border-2 border-ok px-4 py-2 font-bold text-ok hover:bg-panel disabled:opacity-50">
            {busy ? 'Saving…' : '✓ Mark fixed'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-ok">Fixed by {report.resolved_by}{report.resolved_at ? ` · ${new Date(report.resolved_at).toLocaleDateString()}` : ''}{report.resolution_note ? `: ${report.resolution_note}` : ''}</p>
      )}
      {error && <p className="text-bad">{error}</p>}
    </article>
  )
}
