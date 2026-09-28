import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { hashFile } from './deriveRange';
import type { Lockfile } from './lockfile';

/**
 * One content version for every served font file, appended as `?v=` to every
 * font URL so `/fonts/**` can be cached as immutable (see firebase.json and
 * CLAUDE.md). One version rather than one per file: fonts change a few times a
 * year, and per-file hashes would ship ~1,200 of them to the client just so
 * getFontFileURL can build a creator face's URL.
 *
 * The lockfile already hashes every file the manifest serves; the Safari color
 * emoji slices are the only served files outside it, so they are hashed here.
 * The stylesheets are hashed too: they live under /fonts/ as well, and a range
 * can change without any font's bytes changing.
 */

const SAFARI_EMOJI_DIR = 'static/fonts/NotoColorEmoji';

export function fontsVersion(
    lock: Lockfile,
    stylesheets: readonly string[],
): string {
    const hash = crypto.createHash('sha256');
    for (const css of stylesheets) hash.update(css);
    for (const url of Object.keys(lock).sort())
        hash.update(`${url}:${lock[url]?.hash ?? ''}\n`);
    for (const name of fs.readdirSync(SAFARI_EMOJI_DIR).sort())
        if (/^NotoColorEmoji\.svg-/.test(name))
            hash.update(
                `${name}:${hashFile(path.join(SAFARI_EMOJI_DIR, name))}\n`,
            );
    return hash.digest('hex').slice(0, 12);
}

/** Append the version to every `url(/fonts/…)` in a stylesheet. */
export function withFontsVersion(css: string, version: string): string {
    return css.replaceAll(
        /url\((\/fonts\/[^)?]+)\)/g,
        (_, url: string) => `url(${url}?v=${version})`,
    );
}
