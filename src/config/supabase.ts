import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// P1 — GLOBAL REQUEST TIMEOUT.
//
// Without a custom fetch, *every* Supabase call (queries, .rpc(),
// storage.*, and auth.* — which `.abortSignal()` cannot even reach)
// can hang forever on a dead/half-open socket. A hang never throws,
// so react-query's `retry` never fires and `isLoading` stays true
// forever: the eternal spinner. This turns every hang into a throw,
// which the error branches can actually render.
//
// 15s is deliberately generous — a Supabase project waking from
// auto-pause cold-starts in ~10-20s.
const REQUEST_TIMEOUT_MS = 15_000;

// H3 — but 15s is NOT enough for a storage upload. An onboarding avatar
// is a ~2MB JPEG; on a weak mobile uplink that takes far longer than
// any API round-trip, and the global timeout would abort it — making
// onboarding fail on exactly the connections where it matters most.
// Storage transfers get their own, much larger budget. Everything else
// (queries, .rpc(), auth.*) stays on the tight 15s.
const STORAGE_TIMEOUT_MS = 60_000;

const STORAGE_PATH = '/storage/v1/';

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url ?? '';
};

const timeoutFor = (input: RequestInfo | URL): number =>
  urlOf(input).includes(STORAGE_PATH) ? STORAGE_TIMEOUT_MS : REQUEST_TIMEOUT_MS;

type MergedSignal = {
  signal: AbortSignal;
  cleanup: () => void;
};

// React Native polyfills AbortController with `abort-controller@3`
// (see RN's setUpXHR), which predates both `AbortSignal.timeout` and
// `AbortSignal.any`. So: use them when the runtime has them, and fall
// back to a manual merge when it doesn't. Either way a caller-supplied
// signal (useChat / useMatches call `.abortSignal()`) still aborts the
// request — the timeout is an *additional* trigger, not a replacement.
const withTimeout = (
  timeoutMs: number,
  external?: AbortSignal | null,
): MergedSignal => {
  const timeoutOf = (
    AbortSignal as unknown as {
      timeout?: (ms: number) => AbortSignal;
    }
  ).timeout;
  const anyOf = (
    AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;

  if (typeof timeoutOf === 'function') {
    const timeoutSignal = timeoutOf(timeoutMs);
    if (!external) {
      return {
        signal: timeoutSignal,
        cleanup: () => {},
      };
    }
    if (typeof anyOf === 'function') {
      return {
        signal: anyOf([external, timeoutSignal]),
        cleanup: () => {},
      };
    }
  }

  // Manual merge: one controller that fires on whichever comes first.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();

  if (external) {
    if (external.aborted) {
      controller.abort();
    } else {
      external.addEventListener('abort', onExternalAbort);
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    },
  };
};

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const { signal, cleanup } = withTimeout(timeoutFor(input), init?.signal);
  try {
    return await fetch(input, {
      ...init,
      signal,
    });
  } finally {
    // The response has fully arrived (RN's fetch buffers the body), so
    // disarming the timer here can't abort an in-flight read — it only
    // stops a late abort of an already-settled request.
    cleanup();
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // ✅ κρατάει session σε RN
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN δεν έχει URL callbacks
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
