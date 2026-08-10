const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const env = {
  supabaseUrl: supabaseUrl?.trim() ?? '',
  supabasePublishableKey: supabasePublishableKey?.trim() ?? '',
}

export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 && env.supabasePublishableKey.length > 0
