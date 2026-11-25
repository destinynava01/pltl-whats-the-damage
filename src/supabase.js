import { createClient } from '@supabase/supabase-js'

// The same Supabase project as the PLTL Jeopardy site (shared questions, subjects and reviewers).
// Copy the two values from that project into .env.local (see .env.example).
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isConfigured = Boolean(url && key)
export const supabase = isConfigured ? createClient(url, key) : null
