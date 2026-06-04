import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            exclude: [...configDefaults.exclude, 'tests/end2end/*'],
            // Populate the conflict-resolution registry before any test runs.
            // The registration file imports node classes whose own imports
            // form a cycle with the conflict files, so it must load after the
            // module graph settles — not via direct import from conflicts.
            setupFiles: ['./src/conflicts/registerTypeResolutions.ts'],
            // Threads spin up faster than the default forks pool, and these are
            // pure node-env, logic-only tests with no native-process needs.
            // (Isolation stays on: turning it off leaks vi.mock state across
            // files — e.g. the db tests' `vi.mock('@db/Database')` bleeds into
            // TextBasis/Table tests that import the real module.)
            pool: 'threads',
        },
    }),
);
