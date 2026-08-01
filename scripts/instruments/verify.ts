/**
 * Drift detection, shared by the CLI and `npm test` — the split
 * `scripts/fonts/verify.ts` uses, so the cheap checks run on every test run
 * and nothing can quietly diverge.
 *
 * What this catches: a shipped mp3 edited or lost, a lockfile that disagrees
 * with the generated zone map, a manifest instrument with no zones, and a
 * palette instrument that is neither sampled nor deliberately synthesis-only.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { hashOf } from './fetch';
import { LockPath, OutputDir, type Lockfile } from './build';
import {
    Bitrate,
    Manifest,
    PeakCeiling,
    ReleaseFade,
    SampleRate,
    TargetLoudness,
} from './manifest';

/** Licences whose terms we can meet by shipping a derivative plus credit. */
export const AllowedLicenses = ['CC0-1.0', 'CC-BY-2.5', 'CC-BY-3.0', 'CC-BY-4.0'];

export function readLock(): Lockfile | undefined {
    if (!existsSync(LockPath)) return undefined;
    return JSON.parse(readFileSync(LockPath, 'utf8'));
}

/** Every shipped mp3 is present and byte-identical to what was built. */
export function checkHashes(lock: Lockfile): string[] {
    const problems: string[] = [];
    for (const [id, zones] of Object.entries(lock.instruments)) {
        if (zones.length === 0) {
            problems.push(`${id} has no zones in the lockfile`);
            continue;
        }
        for (const zone of zones) {
            const file = path.join(OutputDir, zone.file);
            if (!existsSync(file)) {
                problems.push(`missing ${zone.file}`);
                continue;
            }
            const hash = hashOf(readFileSync(file));
            if (hash !== zone.hash)
                problems.push(
                    `${zone.file} changed on disk (expected ${zone.hash.slice(0, 12)}, found ${hash.slice(0, 12)})`,
                );
        }
    }
    return problems;
}

/** The lockfile's settings match the manifest's, so a changed target can't
 * leave differently-normalized zones sitting side by side. */
export function checkSettings(lock: Lockfile): string[] {
    const expected = {
        targetLoudness: TargetLoudness,
        peakCeiling: PeakCeiling,
        sampleRate: SampleRate,
        bitrate: Bitrate,
        releaseFade: ReleaseFade,
    };
    const problems: string[] = [];
    for (const [key, value] of Object.entries(expected))
        if (lock.settings[key as keyof typeof expected] !== value)
            problems.push(
                `lockfile was built with ${key} ${lock.settings[key as keyof typeof expected]}, manifest now says ${value}`,
            );
    return problems;
}

/** Every manifest instrument produced zones, and every zone records where it
 * came from and under what licence. */
export function checkProvenance(lock: Lockfile): string[] {
    const problems: string[] = [];
    for (const instrument of Manifest)
        if ((lock.instruments[instrument.id] ?? []).length === 0)
            problems.push(`${instrument.id} is in the manifest but has no zones`);
    for (const [id, zones] of Object.entries(lock.instruments))
        for (const zone of zones) {
            if (!zone.sourceUrl || !zone.license || !zone.author)
                problems.push(`${id}/${zone.file} is missing provenance`);
            // We ship derivatives, so the licence has to permit that.
            // CC0 asks nothing; CC BY asks for credit, which CREDITS.md
            // gives. Share-alike would attach its terms to our own audio, so
            // it stays out unless someone decides otherwise deliberately.
            if (!AllowedLicenses.includes(zone.license))
                problems.push(
                    `${id}/${zone.file} is ${zone.license}; allowed: ${AllowedLicenses.join(', ')}`,
                );
            if (zone.license !== 'CC0-1.0' && !zone.author)
                problems.push(
                    `${id}/${zone.file} is ${zone.license}, which requires attribution, but names no author`,
                );
        }
    return problems;
}

export async function verifyAll(): Promise<string[]> {
    const lock = readLock();
    if (lock === undefined)
        return ['no instruments.lock.json — run `npm run instruments-build`'];
    return [
        ...checkSettings(lock),
        ...checkHashes(lock),
        ...checkProvenance(lock),
    ];
}
