import { defineConfig } from 'vitest/config';

/**
 * Config for Firestore security-rules tests only, which need a running
 * Firestore emulator (see the `test:rules` script). Deliberately not merged
 * with the app's vite config: rules tests exercise firestore.rules over the
 * emulator's REST API and need none of the Svelte plugin pipeline or app
 * setup files.
 */
export default defineConfig({
    test: {
        include: ['tests/rules/**/*.test.ts'],
        // Rules evaluation round-trips to the emulator; give it headroom.
        testTimeout: 20000,
        hookTimeout: 60000,
    },
});
