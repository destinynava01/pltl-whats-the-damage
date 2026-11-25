import { supabase } from './supabase'

// Every backend call goes through here. The backend is the shared Supabase project's Edge Functions.
export async function callFunction(name, payload, fallbackMessage) {
  if (!supabase) throw new Error('Supabase is not set up yet. See the README.')
  const { data, error } = await supabase.functions.invoke(name, { body: payload })
  if (error) {
    let message = error.message || fallbackMessage
    try {
      const errorBody = await error.context?.json()
      if (errorBody?.error) message = errorBody.error
    } catch {
      // Not JSON (e.g. a network failure): keep the fallback
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

// The leader (lobby, the projector board, results)
export const wdGame = (payload) => callFunction('wd-game', payload, 'Unable to contact the game server.')
// Phones (join, status, answer as lead solver)
export const wdPlay = (payload) => callFunction('wd-play', payload, 'Unable to reach the game.')

// Calls onChange whenever the server signals one of `events` ('lobby', 'state'), with a slow fallback check
export function watchGame(gameId, events, onChange, fallbackMs = 15000) {
  if (!supabase) return () => {}
  let channel = supabase.channel(`wd-${gameId}`)
  for (const event of events) channel = channel.on('broadcast', { event }, () => onChange())
  channel.subscribe()
  const intervalId = setInterval(onChange, fallbackMs)
  return () => {
    clearInterval(intervalId)
    supabase.removeChannel(channel)
  }
}
