// The units under test import from modules that also pull in the Supabase
// client, which reads EXPO_PUBLIC_* at import time. The tests never make a
// request — these only have to exist so importing the module does not throw.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';
