// Change these to rebrand the game.
export const SITE_NAME = "What's the Damage?"
export const SITE_TAGLINE = 'The food truck lost its menu. Solve the receipts!'
export const HUB_URL = 'https://pltl-game-hub.vercel.app'

export const MIN_TEAMS = 1
export const MAX_TEAMS = 8
export const TEAM_COLORS = ['#e4572e', '#2a9d8f', '#f4a261', '#6a4c93', '#1982c4', '#8ac926', '#ff595e', '#e9c46a']
export const DURATIONS = [null, 20, 30, 45] // minutes (null: no clock)
export const MODES = [
  { id: '2', name: '2 unknowns', text: 'Every order has 2 items (x and y).' },
  { id: '3', name: '3 unknowns', text: 'Every order has 3 items (x, y and z).' },
  { id: 'mix', name: 'Mix', text: 'Orders alternate: 2 items, then 3.' },
]
export const ORDER_COUNTS = [4, 6, 8]

// mm:ss left on the clock
export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "2🌮 + 1🥤" for a receipt's quantities
export const lineOf = (items, qty) => items.map((it, i) => (qty[i] ? `${qty[i]} ${it.emoji}` : '')).filter(Boolean).join(' + ')

// Leader scenarios (the /scenarios and /review pages): this game's id, and the pages' background
export const SCENARIO_GAME = 'whatsthedamage'
export const PAGE_BG = 'bg-board'
