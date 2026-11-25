# What's the Damage?

A PLTL college algebra game about systems of linear equations. A food truck lost its menu board, but the old
receipts survived ("2 tacos + 1 agua fresca = $8.50"). Every order is a system of equations:

1. **The prices:** solve the receipts for every item's price (2 or 3 unknowns). A button shows the receipts as
   x, y, z equations. Wrong prices are told which receipts they do and don't satisfy.
2. **The damage:** with those prices, total up a new customer's order.

Every team gets its own generated orders (always exactly one solution, with prices in clean 25¢ steps). One
student per team is the **lead solver** and types each answer; the role rotates every step. Wrong tries cost a
quarter of a step's points; after three, the team can see the answer and move on (0 points). The leader picks 2
unknowns, 3 or a mix, 4, 6 or 8 orders, and an optional clock. Every phone has a calculator.

The projector shows every team's truck, stamping each order PAID as it's served. The results show every system
with its answer, and an Excel download.

## Pages

| Path | Who | What |
|---|---|---|
| `/` | Leader | Lobby (teams, unknowns, orders, clock), then the truck board and results |
| `/join` | Students | Join with the code, read the receipts, answer when you're the lead solver |

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the shared PLTL Supabase project's URL and publishable key.
3. `npm run dev`

The backend lives in the shared `supabase-backend` repo: the `wd-game` and `wd-play` Edge Functions, the order
generator and checking in `_shared/whatsTheDamage.ts` (with tests), and the `whats_the_damage` migration.

On Vercel, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for **Production** (and Preview).
