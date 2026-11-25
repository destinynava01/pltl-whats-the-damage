// Shared building blocks with the food-truck look: a chalkboard wall, the striped awning, paper cards and receipts

export function CenterCard({ title, children }) {
  return (
    <main className="chalk-bg flex min-h-dvh items-center justify-center p-4 text-ink">
      <div className="soft-shadow w-full max-w-md overflow-hidden rounded-2xl bg-card text-center">
        <div className="awning" />
        <div className="p-8 pt-4">
          <h1 className="font-display text-4xl text-accent">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}

export function Label({ children, className = '' }) {
  return <p className={`text-xs font-bold uppercase tracking-[0.2em] text-info ${className}`}>{children}</p>
}

const BUTTONS = {
  primary: 'bg-accent text-on-accent hover:brightness-110',
  teal: 'bg-info text-white hover:brightness-110',
  outline: 'border-2 border-line bg-card text-ink hover:bg-hover',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-xl px-6 py-3 font-display text-lg tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${BUTTONS[variant]} ${className}`}
      {...props}
    />
  )
}

// A white card (with the awning across the top when `awning`)
export function Card({ children, className = '', awning = false }) {
  return (
    <section className={`soft-shadow overflow-hidden rounded-2xl bg-card ${className}`}>
      {awning && <div className="awning" />}
      <div className={awning ? 'p-5 pt-3' : 'p-5'}>{children}</div>
    </section>
  )
}

// One receipt from the order: the items and quantities on the left, the total on the right
export function Receipt({ number, items, qty, total, className = '' }) {
  return (
    <div className={`receipt rounded-t-md px-4 pt-3 text-sm ${className}`}>
      <p className="flex justify-between text-xs text-muted"><span>RECEIPT #{number}</span><span>THANK YOU!</span></p>
      <div className="my-1.5 border-t border-dashed border-line" />
      {items.map((it, i) => (qty[i] ? (
        <p key={it.id} className="flex justify-between"><span>{qty[i]} × {it.emoji} {it.name}</span><span className="text-muted">??</span></p>
      ) : null))}
      <div className="my-1.5 border-t border-dashed border-line" />
      <p className="flex justify-between font-bold"><span>TOTAL</span><span>{total}</span></p>
    </div>
  )
}
