import { readLock } from './lockfile';
import { checkInputs, checkOutputs } from './verify';

/**
 * Logo asset tooling dispatcher, mirroring the fonts pattern:
 *   npm run logo       — verify (drift check); nonzero exit on drift
 *   npm run logo-fix   — regenerate all assets from logoMark.ts + manifest
 *
 * Verification is pure hashing and runs everywhere (including logoSync.test.ts
 * in `npm test`); regeneration loads the resvg rasterizer and is a manual,
 * maintainer-machine action — never CI or postinstall.
 */

const command = process.argv[2] ?? 'verify';

if (command === 'verify') {
    const lock = readLock();
    const problems = [...checkInputs(lock), ...checkOutputs(lock)];
    if (problems.length > 0) {
        console.error(`Logo drift detected (${problems.length}):`);
        for (const problem of problems) console.error(`  - ${problem}`);
        console.error('\nRun `npm run logo-fix` to regenerate.');
        process.exit(1);
    }
    console.log('Logo assets are in sync.');
} else if (command === 'fix') {
    // Dynamic import so verify never loads the native rasterizer.
    const { fix } = await import('./generate');
    fix();
} else {
    console.error(`Unknown command ${command}; use verify or fix.`);
    process.exit(1);
}
