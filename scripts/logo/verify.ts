import * as fs from 'node:fs';
import { InputFiles, outputFiles } from './manifest';
import { hashFile, pinnedResvgVersion, type Lockfile } from './lockfile';

/**
 * Pure drift checks shared by the `npm run logo` CLI and logoSync.test.ts,
 * the way scripts/fonts/verify.ts is shared with fontsSync.test.ts. These
 * only hash files — the rasterizer is never loaded — so they're fast and run
 * everywhere.
 */

/** Every generated asset exists and matches its locked hash, and the lock
 *  has no entries for files the manifest no longer declares. */
export function checkOutputs(lock: Lockfile): string[] {
    const problems: string[] = [];
    const declared = outputFiles();
    for (const file of declared) {
        if (!fs.existsSync(file)) {
            problems.push(`${file} is missing`);
            continue;
        }
        const locked = lock.outputs[file];
        if (locked === undefined) problems.push(`${file} is not in the lock`);
        else if (hashFile(file) !== locked)
            problems.push(`${file} does not match its locked hash`);
    }
    for (const file of Object.keys(lock.outputs))
        if (!declared.includes(file))
            problems.push(`lock has stale output entry ${file}`);
    return problems;
}

/** Every input that determines the assets matches its locked hash, so
 *  editing the geometry or manifest without regenerating fails. */
export function checkInputs(lock: Lockfile): string[] {
    const problems: string[] = [];
    for (const file of InputFiles) {
        if (!fs.existsSync(file)) {
            problems.push(`input ${file} is missing`);
            continue;
        }
        const locked = lock.inputs[file];
        if (locked === undefined)
            problems.push(`input ${file} is not in the lock`);
        else if (hashFile(file) !== locked)
            problems.push(`input ${file} changed since assets were generated`);
    }
    if (lock.resvg !== pinnedResvgVersion())
        problems.push(
            `@resvg/resvg-js is ${pinnedResvgVersion()} but assets were generated with ${lock.resvg || 'an unknown version'}`,
        );
    return problems;
}
