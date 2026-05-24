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
        },
    }),
);
