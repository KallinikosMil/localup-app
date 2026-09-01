const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'node_modules/**',
      // Vendored agent skills. Somebody else's scripts, on somebody
      // else's conventions — linting them turned the verify gate into
      // 148 errors from files we do not own and cannot fix.
      '.agents/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      // Deno, not Node: the Edge Function imports `jsr:@supabase/supabase-js`
      // and `https://deno.land/...`, which this resolver cannot follow and
      // should not try to. It is type-checked by `supabase functions deploy`.
      'supabase/functions/**',
    ],
  },
]);

// Deliberately NOT enabled: react/jsx-no-leaked-render. The house rule it
// would encode is real (`{cond && <X/>}` renders falsy values and crashes RN
// with "Text strings must be rendered within a <Text> component"), but the
// rule also fires on `&&` inside ordinary boolean PROPS — `secureTextEntry={
// secureTextEntry && !isVisible}` — which is correct code. On this codebase it
// produced three such false positives and zero true ones, because the sweep
// already happened. A lint script that cries wolf is one people stop reading,
// and that costs more than the rule was going to catch. The convention stays
// in CLAUDE.md and is enforced in review.
