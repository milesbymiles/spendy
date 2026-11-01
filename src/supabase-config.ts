// Supabase project used for sign-in and sync. Both values are public by design:
// Row Level Security (supabase/schema.sql) is what keeps each user's data private.
export const supabaseConfig = {
  url: 'https://eyrmjqxwgyzfnjnrmxds.supabase.co',
  /** Publishable / anon key from Project Settings → API Keys. Never the secret / service_role key. */
  anonKey: 'sb_publishable_Ub4tXzP2nHN1O7LDnC8hJg_7WTGhD7v',
}

export const cloudEnabled = supabaseConfig.anonKey !== ''
