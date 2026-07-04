import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { Scripts } from '@locale/Scripts';
import { FallbackFaces, UncoveredScripts } from './faces.generated';
import {
    FallbackFontFamilies,
    getFallbackFaceForScript,
    getFallbackFontFileURLs,
} from './FallbackFonts';
import { Faces, SupportedFaces, rangeContains } from './Fonts';
import {
    baseFallbackCoverage,
    readLock,
} from '../../../scripts/fonts/lockfile';
import { computeFallbackRanges } from '../../../scripts/fonts/stylesheets';

/** The scripts the preloaded Noto Sans covers, which therefore need no
 * fallback face. */
const PreloadedScripts = new Set<string>(['Latn', 'Cyrl', 'Grek', 'Emoj']);

/** The CJK creator faces deliberately shared with the fallback chain. */
const SharedCJKFaces = [
    'Noto Sans Japanese',
    'Noto Sans Korean',
    'Noto Sans Simplified Chinese',
];

/** The distinct ISO 15924 script codes appearing in the glyph data. */
function getPresentScripts(): Set<string> {
    const codes = fs.readFileSync(
        path.join('static', 'unicode', 'codes.txt'),
        'utf-8',
    );
    const scripts = new Set<string>();
    for (const line of codes.split('\n')) {
        const script = line.split(';')[2];
        if (script) scripts.add(script);
    }
    return scripts;
}

function isValidRange(range: string): boolean {
    return range
        .split(',')
        .every((part) =>
            /^U\+[0-9A-Fa-f]{1,6}(-[0-9A-Fa-f]{1,6})?$/.test(part.trim()),
        );
}

describe('fallback face coverage', () => {
    test('every script in the glyph data is preloaded, covered, or knowingly uncovered', () => {
        const covered = new Set<string>(
            FallbackFaces.flatMap((face) => [...face.scripts]),
        );
        const uncovered = new Set<string>(UncoveredScripts);
        for (const script of getPresentScripts()) {
            const states = [
                PreloadedScripts.has(script),
                covered.has(script),
                uncovered.has(script),
            ].filter(Boolean).length;
            expect(
                states,
                `script ${script} should be exactly one of preloaded, covered, or uncovered`,
            ).toBe(1);
        }
    });

    test('uncovered scripts are absent from the glyph data and the fallback registry', () => {
        const present = getPresentScripts();
        const covered = new Set<string>(
            FallbackFaces.flatMap((face) => [...face.scripts]),
        );
        for (const script of UncoveredScripts) {
            // No bundled font renders them, so codes.txt — now filtered to
            // renderable glyphs (see compress.ts) — contains none of their
            // codepoints, and they're not in the fallback registry.
            expect(
                present.has(script),
                `${script} should be absent from codes.txt`,
            ).toBe(false);
            expect(covered.has(script), `${script} should not be covered`).toBe(
                false,
            );
        }
    });

    test('fallback faces never leak into the creator font chooser', () => {
        for (const face of FallbackFaces) {
            if (SharedCJKFaces.includes(face.name)) continue;
            expect(
                SupportedFaces.includes(face.name),
                `${face.name} should not be a creator face`,
            ).toBe(false);
        }
    });

    test('getFallbackFaceForScript finds a face for covered scripts', () => {
        expect(getFallbackFaceForScript('Arab')?.name).toBe('Noto Sans Arabic');
        expect(getFallbackFaceForScript('Cher')?.name).toBe(
            'Noto Sans Cherokee',
        );
        expect(getFallbackFaceForScript('Latn')).toBeUndefined();
    });
});

describe('fallback face ranges and files', () => {
    test('every range string is a valid CSS unicode-range with content', () => {
        for (const face of FallbackFaces) {
            expect(face.ranges.length).toBeGreaterThan(0);
            for (const range of face.ranges) {
                expect(
                    isValidRange(range),
                    `${face.name} range "${range}" should parse`,
                ).toBe(true);
                // rangeContains agrees the range's first codepoint is inside it.
                const first = range.trim().match(/^U\+([0-9A-Fa-f]+)/);
                expect(first).not.toBeNull();
                if (first)
                    expect(rangeContains(range, parseInt(first[1], 16))).toBe(
                        true,
                    );
            }
        }
    });

    test('every declared font file exists and is non-empty', () => {
        for (const face of FallbackFaces) {
            for (const [index] of face.ranges.entries()) {
                for (const url of getFallbackFontFileURLs(face, index)) {
                    const file = path.join(
                        'static',
                        ...url.split('/').filter(Boolean),
                    );
                    expect(
                        fs.existsSync(file) && fs.statSync(file).size > 0,
                        `${file} should exist and be non-empty`,
                    ).toBe(true);
                }
            }
        }
    });

    test('the shared CJK creator faces use the fallback registry ranges', () => {
        for (const name of SharedCJKFaces) {
            const creator = Faces[name];
            const fallback = FallbackFaces.find((face) => face.name === name);
            expect(
                fallback,
                `${name} should be in the fallback registry`,
            ).toBeDefined();
            expect(creator.preloaded).toBe(true);
            expect(creator.ranges).toEqual(fallback?.ranges);
        }
    });
});

describe('CSS and TS artifacts stay in sync', () => {
    const css = fs.readFileSync(
        path.join('static', 'fonts', 'fonts-fallback.css'),
        'utf-8',
    );

    test('the CSS custom property equals FallbackFontFamilies', () => {
        const varValue = css.match(
            /--wordplay-fallback-fonts:\s*([^;]+);/,
        )?.[1];
        // Normalize whitespace and quote style: prettier prefers single
        // quotes in CSS, while the TS literal uses double quotes.
        expect(
            varValue?.replaceAll(/\s+/g, ' ').replaceAll("'", '"').trim(),
        ).toBe(FallbackFontFamilies);
    });

    test('the CSS @font-face declarations match the registry', async () => {
        // Collect (family, weight, url, range) tuples from the CSS.
        const declared = new Set<string>();
        for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
            const body = block[1];
            const family = body.match(/font-family:\s*'([^']+)';/)?.[1];
            const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim();
            const url = body.match(/src:\s*url\(([^)]+)\)/)?.[1];
            const range = body
                .match(/unicode-range:\s*([^;]+);/)?.[1]
                ?.replaceAll(/\s+/g, ' ')
                .trim();
            expect(family && weight && url && range).toBeTruthy();
            declared.add(`${family}|${weight}|${url}|${range}`);
        }

        // Derive the same tuples from the registry. The registry keeps each
        // face's full range (its honest coverage, used only as data), but the
        // CSS de-duplicates the ranges so each codepoint lives on exactly one
        // face (computeFallbackRanges); look up each slice's de-duped range and
        // drop any left empty (omitted from the CSS).
        const deduped = computeFallbackRanges(
            readLock(),
            await baseFallbackCoverage(),
        );
        const expected = new Set<string>();
        for (const face of FallbackFaces) {
            const weightKeys: { key: string; css: string }[] =
                'min' in face.weights
                    ? [
                          {
                              key: 'all',
                              css: `${face.weights.min} ${face.weights.max}`,
                          },
                      ]
                    : face.weights.map((weight) => ({
                          key: `${weight}`,
                          css: `${weight}`,
                      }));
            expect(weightKeys.length).toBeGreaterThan(0);
            for (const { key, css: cssWeight } of weightKeys) {
                for (const index of face.ranges.keys()) {
                    const [url] = getFallbackFontFileURLs(face, index).filter(
                        (u) => u.includes(`-${key}-`),
                    );
                    // deduped is keyed by the served path without a leading '/'.
                    const narrowed = deduped.get(url.replace(/^\//, '')) ?? '';
                    if (narrowed === '') continue;
                    expected.add(`${face.name}|${cssWeight}|${url}|${narrowed}`);
                }
            }
        }

        expect(declared).toEqual(expected);
    });
});

describe('script endonyms render without tofu', () => {
    test('every covered script name is claimed by some declared face', () => {
        // The union of everything the font-family chains can serve: the
        // preloaded faces' ranges plus all fallback faces' ranges.
        const allRanges: string[] = [
            ...FallbackFaces.flatMap((face) => [...face.ranges]),
            ...Object.values(Faces).flatMap((face) =>
                face.ranges === undefined
                    ? []
                    : typeof face.ranges === 'string'
                      ? [face.ranges]
                      : [...face.ranges],
            ),
        ];
        const claimed = (codepoint: number) =>
            allRanges.some((range) => rangeContains(range, codepoint));

        const covered = new Set<string>(
            FallbackFaces.flatMap((face) => [...face.scripts]),
        );
        const present = getPresentScripts();
        for (const [script, metadata] of Object.entries(Scripts)) {
            if (!present.has(script) && script !== 'Emoj') continue;
            if (!covered.has(script) && !PreloadedScripts.has(script)) continue;
            for (const character of metadata.name) {
                const codepoint = character.codePointAt(0);
                if (codepoint === undefined || codepoint < 0x80) continue;
                expect(
                    claimed(codepoint),
                    `script ${script} name "${metadata.name}" character "${character}" (U+${codepoint.toString(16)}) should be claimed by a declared face`,
                ).toBe(true);
            }
        }
    });
});
