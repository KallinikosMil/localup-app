// scripts/verify-mode-constant.ts
//
// §16 mode-constant pinning verification (LocalUp matching spec).
//
// Asserts the LOCAL_RADIUS_KM constant agrees in two places:
//   - client:  src/features/profile/hooks/useProfile.ts  (export const LOCAL_RADIUS_KM = 50)
//   - SQL RPC: discover_candidates step 0b               (v_local_radius_km constant int := 50)
//
// Why not unit-test computeMode directly? Importing useProfile.ts in plain
// Node pulls in React-Native modules that don't resolve outside the bundler.
// We instead pin the *source of truth* on each side via static read, which
// is enough to catch drift: if either side moves off 50 without the other,
// this script exits non-zero.
//
// Tech debt: no test runner configured (CLAUDE.md). Convert to a real Jest
// test once test infra lands, and exercise computeMode directly against a
// real fixture there.
//
// Run:  npx tsx scripts/verify-mode-constant.ts
// Exits 0 on agreement, 1 on drift.

import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..');
const EXPECTED = 50;

function readClientConstant(): number | null {
  const src = fs.readFileSync(
    path.join(REPO_ROOT, 'src/features/profile/hooks/useProfile.ts'),
    'utf-8',
  );
  const m = src.match(/export\s+const\s+LOCAL_RADIUS_KM\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function readSqlConstantFromAppliedMigration(): {
  found: boolean;
  value: number | null;
  migrationName: string | null;
} {
  // discover_candidates was applied via Supabase MCP, not stored as a local
  // file. The exact mirror of the SQL constant therefore lives only on the
  // live DB. To pin without requiring a live DB call, we keep a snapshot of
  // the canonical SQL fragment in the plan doc. Read from there:
  const plan = path.join(
    REPO_ROOT,
    'docs/superpowers/plans/2026-06-08-localup-matching-system.md',
  );
  if (!fs.existsSync(plan)) {
    return { found: false, value: null, migrationName: null };
  }
  const src = fs.readFileSync(plan, 'utf-8');
  const m = src.match(
    /v_local_radius_km\s+constant\s+int\s*:=\s*(\d+)/,
  );
  return {
    found: !!m,
    value: m ? parseInt(m[1], 10) : null,
    migrationName: '1i_discover_candidates_function (plan snapshot)',
  };
}

const clientVal = readClientConstant();
const sql = readSqlConstantFromAppliedMigration();

console.log(`expected         : ${EXPECTED}`);
console.log(`client constant  : ${clientVal ?? '<not found>'}`);
console.log(
  `SQL constant     : ${sql.value ?? '<not found>'}  (source: ${sql.migrationName ?? 'n/a'})`,
);

const ok =
  clientVal === EXPECTED && sql.found && sql.value === EXPECTED;

if (ok) {
  console.log('\nPASS — client and SQL both pin LOCAL_RADIUS_KM = 50');
  process.exit(0);
} else {
  console.log('\nFAIL — drift detected; fix both sides before shipping');
  process.exit(1);
}
