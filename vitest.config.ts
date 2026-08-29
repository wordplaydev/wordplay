import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import IsolatedTests from './src/util/isolatedTests';
import viteConfig from './vite.config';

// Rules tests need the Firestore emulator; run them via `npm run test:rules`.
const Exclude = [...configDefaults.exclude, 'tests/end2end/*', 'tests/rules/*'];

// Populate the conflict-resolution registry before any test runs.
// The registration file imports node classes whose own imports
// form a cycle with the conflict files, so it must load after the
// module graph settles — not via direct import from conflicts.
const SetupFiles = ['./src/conflicts/registerTypeResolutions.ts'];

// Threads spin up faster than the default forks pool, and these are
// pure node-env, logic-only tests with no native-process needs.
const Pool = 'threads';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            // Isolation is what made this suite the long pole in CI: re-running the setup file's
            // 350-module graph, and rebuilding a Basis whose cache is module state, once per test
            // file put ~38% of all CPU into imports rather than tests. Unisolating more than halves
            // total CPU. The few files that can't share a graph — see src/util/isolatedTests.ts —
            // keep isolation, and nothing else pays for them.
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'fast',
                        exclude: [...Exclude, ...IsolatedTests],
                        setupFiles: SetupFiles,
                        pool: Pool,
                        isolate: false,
                    },
                },
                {
                    extends: true,
                    test: {
                        name: 'isolated',
                        include: IsolatedTests,
                        exclude: Exclude,
                        setupFiles: SetupFiles,
                        pool: Pool,
                        isolate: true,
                    },
                },
            ],
        },
    }),
);
