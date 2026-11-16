/**
 * Public Supabase settings. Both values are safe to expose to the browser:
 * the publishable/anon key only grants what Row Level Security allows.
 * Never put the service-role key in a NEXT_PUBLIC_ variable.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 20;
}
