// The leader's game, remembered in this browser tab so a refresh brings it back. { gameId, hostToken, joinCode }
const KEY = 'whatsTheDamageLeader'

export function readSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    return saved?.gameId && saved?.hostToken ? saved : null
  } catch {
    return null
  }
}

export function saveSession(session) {
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session))
    else sessionStorage.removeItem(KEY)
  } catch {
    // storage blocked
  }
}
