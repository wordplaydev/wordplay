import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Seed the Firebase emulator with the full fixture set before any e2e tests
 * run, so the load tests have every kind of data to exercise (heavy creator
 * account, chats, characters, other-user how-tos, expanded-scope gallery, …).
 *
 * The emulator is already running here because `npm run end2end` invokes
 * Playwright via `firebase emulators:exec`. The seed connects to the emulator
 * through the host env vars it sets internally, and is idempotent (stable IDs),
 * so re-running against existing emulator state is safe.
 */
export default async function globalSetup() {
    // The emulator started by `firebase emulators:exec` is ephemeral: every run
    // re-seeds users with fresh UIDs. The cached browser auth state in
    // playwright/.auth (written by fixtures.ts / loginNewContext) holds Firebase
    // Auth tokens from a PREVIOUS emulator, which the fresh emulator no longer
    // recognizes — so a second consecutive run would reuse stale tokens and every
    // authenticated test would appear logged out (and loginNewContext would skip
    // login entirely, then fail uidForUsername with "no user record"). Wipe the
    // cache so each run authenticates against the emulator it's actually using.
    rmSync(path.resolve('playwright', '.auth'), {
        recursive: true,
        force: true,
    });

    execSync('npx tsx scripts/seed.ts', { stdio: 'inherit' });
}
