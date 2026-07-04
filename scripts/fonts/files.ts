import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Shared model for the font generator: how face names map to on-disk files and
 * how @font-face src URLs are parsed back to (weight, italic, slice index).
 * Mirrors getFontFileURL in src/basis/faces/Fonts.ts.
 */

export const STATIC = 'static';
export const FONTS_DIR = path.join(STATIC, 'fonts');

export function spaceless(name: string): string {
    return name.replaceAll(' ', '');
}

/** Parse a "/fonts/<Dir>/<Dir>-<weight|all>[-italic][-<i>].<ext>" URL. */
export function parseFontUrl(url: string): {
    dir: string;
    weight: string;
    italic: boolean;
    slice: number | undefined;
    ext: string;
} {
    const file = url.split('/').pop() ?? '';
    const m = file.match(/^(.+?)-(all|\d+)(-italic)?(?:-(\d+))?\.(\w+)$/);
    if (m === null) throw new Error(`Unparseable font url: ${url}`);
    return {
        dir: m[1],
        weight: m[2],
        italic: m[3] !== undefined,
        slice: m[4] !== undefined ? Number(m[4]) : undefined,
        ext: m[5],
    };
}

/** Relative path (from static/) for a font file. Always forward-slash: these
 * strings are both lockfile keys and CSS url() values, so they must NOT use the
 * OS path separator (backslash on Windows would break both). Node accepts
 * forward slashes for filesystem reads on Windows too. */
export function fontFile(
    dir: string,
    weight: string,
    italic: boolean,
    slice: number | undefined,
    ext: string,
): string {
    const name = `${dir}-${weight}${italic ? '-italic' : ''}${
        slice !== undefined ? `-${slice}` : ''
    }.${ext}`;
    return `fonts/${dir}/${name}`;
}

/** Every font file present on disk for a face directory, in a stable order.
 * Returns forward-slash relative paths (see fontFile). */
export function faceFiles(dir: string, ext: string): string[] {
    const abs = path.join(FONTS_DIR, dir);
    if (!fs.existsSync(abs)) return [];
    return fs
        .readdirSync(abs)
        .filter((f) => f.endsWith(`.${ext}`) && f.startsWith(`${dir}-`))
        .sort((a, b) => {
            const pa = parseFontUrl(`/x/${a}`);
            const pb = parseFontUrl(`/x/${b}`);
            // Order by weight, then non-italic before italic, then slice index.
            const wa = pa.weight === 'all' ? -1 : Number(pa.weight);
            const wb = pb.weight === 'all' ? -1 : Number(pb.weight);
            if (wa !== wb) return wa - wb;
            if (pa.italic !== pb.italic) return pa.italic ? 1 : -1;
            return (pa.slice ?? -1) - (pb.slice ?? -1);
        })
        .map((f) => `fonts/${dir}/${f}`);
}
