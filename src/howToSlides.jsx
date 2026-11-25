// The "How to play" slides for What's the Damage? (shown before the clock starts). The art uses the same pieces as
// the real game (the receipts, the chalkboard menu, the PAID stamp).
import { Receipt } from './ui'

const TACO = { id: 'taco', name: 'Taco', emoji: '🌮' }
const DRINK = { id: 'drink', name: 'Agua fresca', emoji: '🥤' }

export const SLIDES = [
  {
    title: 'The menu got wiped!',
    text: 'Your food truck lost its menu board, but the old receipts survived. Every receipt is an equation. Every order is a system of equations, with 2 or 3 unknown prices.',
    art: (
      <div className="w-full max-w-xs space-y-3">
        <Receipt number={1042} items={[TACO, DRINK]} qty={[2, 1]} total="$8.50" />
        <Receipt number={1049} items={[TACO, DRINK]} qty={[1, 3]} total="$8.00" />
      </div>
    ),
  },
  {
    title: 'Solve for the prices',
    text: 'Turn the receipts into a system (there\'s a button for that), then use substitution or elimination. Every item has one price, and it has to make EVERY receipt add up.',
    art: (
      <div className="w-full max-w-xs rounded-xl bg-board px-4 py-3 font-mono text-chalk">
        <p className="text-xs text-chalk/70">x = Taco · y = Agua fresca</p>
        <p className="mt-1">2x + y = 8.50</p>
        <p>x + 3y = 8.00</p>
        <p className="mt-2 text-mustard">x = 3.50 · y = 1.50</p>
      </div>
    ),
  },
  {
    title: "Then: what's the damage?",
    text: 'With the menu back, a new customer orders. Multiply each quantity by its price and add it up: that\'s the damage.',
    art: (
      <div className="receipt w-full max-w-xs rounded-t-md px-4 pt-3 text-sm">
        <p className="text-xs text-muted">NEW ORDER</p>
        <div className="my-1.5 border-t border-dashed border-line" />
        <p className="flex justify-between"><span>3 × 🌮 Taco</span><span className="text-muted">@ $3.50</span></p>
        <p className="flex justify-between"><span>2 × 🥤 Agua fresca</span><span className="text-muted">@ $1.50</span></p>
        <div className="my-1.5 border-t border-dashed border-line" />
        <p className="flex justify-between font-bold"><span>TOTAL</span><span>$13.50</span></p>
      </div>
    ),
  },
  {
    title: 'One lead solver at a time',
    text: 'Everyone sees the receipts, but one student is the lead solver and types the answer. The role moves to the next teammate every step, so everyone leads. Talk it out; there\'s a calculator on every phone.',
    art: (
      <div className="w-full max-w-xs space-y-2 text-sm">
        <p className="rounded-xl bg-card px-3 py-2 font-bold text-accent shadow">🧑‍🍳 You&apos;re the lead solver for this step.</p>
        <p className="rounded-xl bg-card px-3 py-2 shadow">🧑‍🍳 <b>Maria</b> is the lead solver. Help out loud!</p>
      </div>
    ),
  },
  {
    title: 'Points and closing time',
    text: 'Prices are worth 100 points (150 with 3 unknowns), the damage 50. Every wrong try costs a quarter of that step; after three you can see the answer and move on for 0. Serve every order first for a bonus!',
    art: (
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className={`relative flex h-16 w-14 items-center justify-center rounded-md border-2 font-bold ${k < 4 ? 'border-ok bg-ok-soft' : 'border-mustard bg-warn-soft'}`}>
            #{k}{k < 4 && <span className="paid absolute text-[0.65rem]">PAID</span>}
          </div>
        ))}
      </div>
    ),
  },
]

// The guide's own look (the truck: a receipt-white card under the striped awning, a chalkboard art box, marker
// lettering). HowToPlay.jsx reads this; anything left out uses its plain dark look.
export const SKIN = {
  backdrop: 'bg-[#101814]/80',
  panel: "rounded-2xl bg-card text-ink shadow-2xl before:block before:h-4 before:content-[''] before:[background:repeating-linear-gradient(90deg,#e4572e_0_34px,#fffdf7_34px_68px)]",
  glow: false,
  label: 'text-sm font-bold uppercase tracking-[0.25em] text-info',
  skip: 'rounded-xl border-2 border-line bg-panel px-3 py-1 text-sm font-bold text-muted hover:bg-hover',
  art: 'chalk-bg rounded-xl',
  step: 'text-sm font-bold uppercase tracking-widest text-muted',
  title: 'font-display text-3xl leading-tight text-accent sm:text-4xl',
  text: 'text-lg leading-relaxed text-ink',
  footer: 'border-t-2 border-dashed border-line bg-panel',
  check: 'text-sm text-muted',
  back: 'rounded-xl border-2 border-line bg-card px-4 py-2 font-display text-ink hover:bg-hover',
  next: 'rounded-xl bg-accent px-5 py-2 font-display text-lg text-on-accent hover:brightness-110',
  dotOff: '#ddd3bb',
  launcher: 'rounded-xl border-2 border-line bg-card px-4 py-2 font-display text-sm text-accent shadow-lg hover:bg-hover',
}
