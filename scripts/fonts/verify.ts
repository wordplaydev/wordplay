import * as fs from 'node:fs';
import * as path from 'node:path';
import { hashFile, readCharacterSet } from './deriveRange';
import { readLock, entryFiles, parseCssRanges } from './lockfile';
import type { Lockfile } from './lockfile';
import { buildFaces, buildFallback, facesRanges } from './faces';
import { FontManifest } from '../../src/basis/faces/fonts.manifest';

/**
 * Drift detection, shared by `npm run fonts` (CLI) and the vitest drift test.
 * The cheap checks (hash + artifact consistency) run in `npm test`; the deep
 * cmap check (declared ⊆ cmap = no tofu) runs on demand in the CLI.
 */

export type Problem = string;

/** Fast: every lockfile file's content hash still matches. Catches a font file
 * changed/added/removed without regenerating. */
export function checkHashes(lock: Lockfile): Problem[] {
    const problems: Problem[] = [];
    const expected = new Set<string>();
    for (const entry of FontManifest) {
        const files = entryFiles(entry);
        // A manifest entry with no files on disk would silently produce no CSS
        // or ranges — flag it so an added-but-not-downloaded font can't slip by.
        if (files.length === 0) {
            problems.push(
                `${entry.name}: no font files on disk — run \`npm run fonts-download\``,
            );
            continue;
        }
        for (const url of files) {
            expected.add(url);
            const filePath = path.join('static', url);
            if (!fs.existsSync(filePath)) {
                problems.push(`missing font file: ${url}`);
                continue;
            }
            const rec = lock[url];
            if (!rec) problems.push(`font file not in lockfile: ${url}`);
            else if (rec.hash !== hashFile(filePath)) {
                // A changed cmap face re-derives from the file (fonts-fix); a
                // changed Google-sliced face needs its partition re-fetched
                // (fonts-download), which fonts-fix can't reconstruct.
                const how =
                    entry.rangeSource === 'google'
                        ? 'fonts-download'
                        : 'fonts-fix';
                problems.push(
                    `changed since last generate: ${url} — run \`npm run ${how}\``,
                );
            }
        }
    }
    for (const url of Object.keys(lock))
        if (!expected.has(url)) problems.push(`stale lockfile entry: ${url}`);
    return problems;
}

/** Files declared inside an emoji override partial (the hand-authored island):
 * exempt from lockfile CSS checks — their ranges are guarded by
 * emojiRange.test.ts. A single file (the SVG face) is even used with two
 * different ranges, which the per-file lockfile can't represent. */
function overrideFiles(): Set<string> {
    const files = new Set<string>();
    for (const entry of FontManifest) {
        if (entry.override === undefined) continue;
        const css = fs.readFileSync(
            path.join('src/basis/faces', entry.override.cssPartial),
            'utf8',
        );
        for (const m of css.matchAll(/src:\s*url\(\/([^)]+)\)/g))
            files.add(m[1]);
    }
    return files;
}

/** Fast: the committed CSS ranges match the lockfile (catches hand-edits to
 * the generated stylesheets). */
export function checkCssConsistency(lock: Lockfile): Problem[] {
    const problems: Problem[] = [];
    const island = overrideFiles();
    const css = parseCssRanges();
    for (const [url, range] of css) {
        if (island.has(url)) continue; // emoji island, guarded separately
        const rec = lock[url];
        if (!rec) {
            problems.push(`CSS references a file not in the lockfile: ${url}`);
            continue;
        }
        const norm = (r: string) => r.replaceAll(/\s+/g, ' ').trim();
        if (rec.range !== null && norm(rec.range) !== norm(range))
            problems.push(`CSS range for ${url} differs from the lockfile`);
    }
    return problems;
}

/** Fast: the committed faces.generated.ts data matches manifest + lockfile.
 * Emoji ranges are derived from cmap (2 small reads) so this stays quick. */
export async function checkRegistryConsistency(
    lock: Lockfile,
    committed: {
        Faces: Record<string, { ranges?: string | readonly string[] }>;
        FallbackFaces: readonly { name: string; ranges: readonly string[] }[];
    },
    emojiRanges: Record<string, string>,
): Promise<Problem[]> {
    const problems: Problem[] = [];
    const genFaces = buildFaces(lock, emojiRanges);
    for (const [name, face] of Object.entries(genFaces)) {
        const got = committed.Faces[name];
        if (!got) {
            problems.push(`Faces missing generated entry: ${name}`);
            continue;
        }
        if (JSON.stringify(got.ranges) !== JSON.stringify(face.ranges))
            problems.push(`Faces[${name}].ranges differs from generated`);
    }
    const genFallback = new Map(buildFallback(lock).map((f) => [f.name, f]));
    for (const f of committed.FallbackFaces) {
        const gen = genFallback.get(f.name);
        if (!gen) {
            problems.push(`FallbackFaces has stale entry: ${f.name}`);
            continue;
        }
        if (JSON.stringify([...f.ranges]) !== JSON.stringify(gen.ranges))
            problems.push(`FallbackFaces[${f.name}].ranges differs`);
    }
    return problems;
}

/** Slow: every declared range ⊆ its file's cmap — the no-tofu invariant, for
 * faces whose ranges WE derive from the cmap. Google's slice partitions
 * legitimately declare block ranges (e.g. U+0000-00FF) that include invisible
 * control codepoints the file lacks a glyph for, so they're trusted, not
 * checked; the emoji faces are guarded by emojiRange.test.ts. */
export async function checkNoOverClaim(lock: Lockfile): Promise<Problem[]> {
    const problems: Problem[] = [];
    for (const entry of FontManifest) {
        if (entry.rangeSource !== 'cmap') continue; // trust google/preserve; emoji guarded separately
        for (const url of entryFiles(entry)) {
            const range = lock[url]?.range;
            if (range == null) continue;
            const cmap = new Set(
                await readCharacterSet(path.join('static', url)),
            );
            for (const part of range.split(',')) {
                const m = part
                    .trim()
                    .match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
                if (!m) continue;
                const lo = parseInt(m[1], 16);
                const hi = m[2] !== undefined ? parseInt(m[2], 16) : lo;
                for (let cp = lo; cp <= hi; cp++)
                    if (!cmap.has(cp)) {
                        problems.push(
                            `${url} over-claims U+${cp.toString(16)} (no glyph)`,
                        );
                        break;
                    }
            }
        }
    }
    return problems;
}

/** Slow: the committed renderable set matches a fresh union of every chain
 * font's cmap (so the glyph chooser filter can't drift into showing tofu). */
export async function checkRenderableSet(): Promise<Problem[]> {
    const { computeRenderableRanges } = await import('./renderableSet');
    const { RenderableRanges } =
        await import('../../src/basis/faces/renderable.generated');
    const fresh = await computeRenderableRanges();
    if (JSON.stringify(fresh) !== JSON.stringify(RenderableRanges))
        return ['renderable.generated.ts is stale — run `npm run fonts-fix`'];
    return [];
}

export { readLock, facesRanges };
