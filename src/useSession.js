import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// The signed-in reviewer's session (null when signed out, undefined while checking). The same reviewers and
// sign-in as the other game sites' review pages.
export function useSession() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    // Also picks up the session when someone arrives from the email's sign-in link
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])
  return session
}
