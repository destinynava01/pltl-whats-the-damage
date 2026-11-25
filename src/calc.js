// The calculator's math: a small, safe expression evaluator (numbers, + − × ÷, parentheses, and scientific
// notation written as E, e.g. 6.022E23). No eval. Returns NaN for anything it can't read.
const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3 }

function tokenize(text) {
  const tokens = []
  const re = /\s*(\d*\.?\d+(?:E[+-]?\d+)?|\d+\.(?:E[+-]?\d+)?|[+\-*/()])/y
  let pos = 0
  while (pos < text.length) {
    re.lastIndex = pos
    const match = re.exec(text)
    if (!match) return null
    tokens.push(match[1])
    pos = re.lastIndex
  }
  return tokens
}

export function evaluate(expression) {
  const tokens = tokenize(expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'))
  if (!tokens || tokens.length === 0) return NaN
  const output = []
  const ops = []
  let expectValue = true
  const apply = (op) => {
    if (op === 'neg') {
      if (output.length < 1) throw new Error('bad')
      output.push(-output.pop())
      return
    }
    if (output.length < 2) throw new Error('bad')
    const b = output.pop()
    const a = output.pop()
    output.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b)
  }
  try {
    for (const t of tokens) {
      if (/^[\d.]/.test(t)) {
        if (!expectValue) return NaN
        output.push(Number(t))
        expectValue = false
      } else if (t === '(') {
        ops.push(t)
        expectValue = true
      } else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') apply(ops.pop())
        if (!ops.length) return NaN
        ops.pop()
        expectValue = false
      } else {
        const op = expectValue && t === '-' ? 'neg' : t
        if (expectValue && op !== 'neg') return NaN
        while (ops.length && ops[ops.length - 1] !== '(' && op !== 'neg' && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[op]) apply(ops.pop())
        ops.push(op)
        expectValue = true
      }
    }
    while (ops.length) {
      const op = ops.pop()
      if (op === '(') return NaN
      apply(op)
    }
  } catch {
    return NaN
  }
  return output.length === 1 ? output[0] : NaN
}

// 6.0221E23 -> "6.0221 × 10^23"; 0.42779 -> "0.42779" (up to 10 significant digits; nothing rounded for them)
export function show(value) {
  if (!Number.isFinite(value)) return 'Error'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1e7 || abs < 1e-4) {
    const [mant, exp] = value.toExponential(9).split('e')
    return `${String(Number(mant))} × 10^${Number(exp)}`
  }
  return String(Number(value.toPrecision(10)))
}

// The same number in the form the amount box understands ("6.0221e23")
export function plain(value) {
  if (!Number.isFinite(value)) return ''
  const abs = Math.abs(value)
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-4)) {
    const [mant, exp] = value.toExponential(9).split('e')
    return `${String(Number(mant))}e${Number(exp)}`
  }
  return String(Number(value.toPrecision(10)))
}
