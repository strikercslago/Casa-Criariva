import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/app/config/env'
import type { Database } from './database.types'

let browserClient: SupabaseClient<Database> | null = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured) {
    return null
  }

  if (!browserClient) {
    browserClient = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}
