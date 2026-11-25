import { useState } from 'react'
import { evaluate, plain, show } from './calc'

// A pocket calculator for the kitchen: + − × ÷, parentheses, and ×10ⁿ for scientific notation. It shows every
// digit; rounding to the right sig figs is the student's job. onUse (the line cook only) copies the result into
// the amount box.
export default function Calculator({ onUse }) {
  const [open, setOpen] = useState(false)
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState(null) // the last = result (a number)

  const pretty = expr.replace(/E/g, ' ×10^').replace(/\*/g, '×').replace(/\//g, '÷')
  const press = (k) => {
    if (k === 'C') { setExpr(''); setResult(null); return }
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); setResult(null); return }
    if (k === '=') { setResult(evaluate(expr)); return }
    // After a result, a digit starts fresh and an operator keeps going from the result
    if (result !== null && Number.isFinite(result)) {
      const fromResult = /^[+\-*/]$/.test(k)
      setExpr(fromResult ? `${plain(result).replace('e', 'E')}${k}` : k)
      setResult(null)
      return
    }
    setResult(null)
    setExpr((e) => e + k)
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-2xl border-2 border-line bg-card py-2 font-bold text-info hover:bg-info-soft">
        🧮 Open the calculator
      </button>
    )
  }

  const key = (label, value = label, cls = '') => (
    <button key={label} type="button" onClick={() => press(value)}
      className={`rounded-xl py-3 text-lg font-bold active:translate-y-0.5 ${cls || 'bg-panel hover:bg-hover'}`}>
      {label}
    </button>
  )

  return (
    <section className="soft-shadow rounded-3xl border-2 border-line bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-info">🧮 Calculator</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-muted hover:text-ink">Hide</button>
      </div>
      <div className="mt-2 rounded-2xl bg-ink px-3 py-2 text-right font-mono text-white">
        <p className="min-h-5 break-all text-sm opacity-70">{pretty || ' '}</p>
        <p className="break-all text-2xl">{result === null ? (pretty ? ' ' : '0') : show(result)}</p>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {key('C', 'C', 'bg-bad-soft text-bad')}{key('(')}{key(')')}{key('÷', '/', 'bg-accent-soft text-accent')}
        {key('7')}{key('8')}{key('9')}{key('×', '*', 'bg-accent-soft text-accent')}
        {key('4')}{key('5')}{key('6')}{key('−', '-', 'bg-accent-soft text-accent')}
        {key('1')}{key('2')}{key('3')}{key('+', '+', 'bg-accent-soft text-accent')}
        {key('0')}{key('.')}{key('×10ⁿ', 'E', 'bg-info-soft text-info text-base')}{key('⌫')}
      </div>
      <button type="button" onClick={() => press('=')} className="mt-1.5 w-full rounded-xl bg-accent py-3 text-xl font-bold text-on-accent">=</button>
      {onUse && result !== null && Number.isFinite(result) && (
        <button type="button" onClick={() => onUse(plain(result))} className="mt-1.5 w-full rounded-xl border-2 border-info py-2 font-bold text-info hover:bg-info-soft">
          Put {show(result)} in the amount box (then round it!)
        </button>
      )}
      <p className="mt-1 text-center text-xs text-muted">For 6.022 × 10²³ press 6.022, then ×10ⁿ, then 23. For a negative power, press − right after ×10ⁿ.</p>
    </section>
  )
}
