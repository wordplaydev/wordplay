/**
 * One orchestrator for the whole emoji-update procedure (see
 * scripts/emoji/README.md). Runs the subsystems in dependency order — fonts
 * first (mono + both color branches + the Safari nanoemoji rebuild + fonts-fix),
 * then codes.txt (filtered against the fonts' renderable set), then per-locale
 * names, then verify — stopping only for the Safari visual QA a script can't do.
 *
 *   npm run emoji-update                 full run (names + fonts)
 *   npm run emoji-update -- --check      report bundled vs upstream, no changes
 *   npm run emoji-update -- --names-only just A+B (a Unicode release, no new font)
 *   npm run emoji-update -- --fonts-only just C+D+E (a Noto release, no new codes)
 *
 * Assumes cwd = repo root (npm run guarantees this).
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';

const VERSIONS = 'scripts/emoji/versions.json';
const EMOJI_TEST_URL =
    'https://www.unicode.org/Public/emoji/latest/emoji-test.txt';
const NOTO_RELEASE_API =
    'https://api.github.com/repos/googlefonts/noto-emoji/releases/latest';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const namesOnly = args.includes('--names-only');
const fontsOnly = args.includes('--fonts-only');
if (namesOnly && fontsOnly) {
    console.error('--names-only and --fonts-only are mutually exclusive.');
    process.exit(1);
}

type Versions = {
    note?: string;
    unicodeEmoji: string | null;
    notoColorEmoji: string | null;
    notoEmojiMono: string | null;
    cldr: string | null;
    updated: string;
};

type Upstream = {
    unicodeEmoji: string;
    notoColorEmoji: string;
    notoEmojiMono: string;
};

const MONO_METADATA_URL =
    'https://fonts.google.com/metadata/fonts/Noto%20Emoji';

function readVersions(): Versions {
    return JSON.parse(fs.readFileSync(VERSIONS, 'utf8'));
}

/** Query the upstream sources for their current versions. The mono font has no
 * published version string, so we track Google Fonts' `lastModified` date for it
 * as a change indicator (a new date = a new mono font is available). */
async function upstreamVersions(): Promise<Upstream> {
    const emojiTest = await (await fetch(EMOJI_TEST_URL)).text();
    const unicodeEmoji = emojiTest.match(/^# Version:\s*([\d.]+)/m)?.[1] ?? '?';
    const release = await (
        await fetch(NOTO_RELEASE_API, {
            headers: {
                'User-Agent': 'wordplay-emoji-update',
                Accept: 'application/vnd.github+json',
            },
        })
    ).json();
    const notoColorEmoji = (release as { tag_name?: string }).tag_name ?? '?';
    const monoMeta = (await (await fetch(MONO_METADATA_URL)).text()).replace(
        /^\)\]\}'/,
        '',
    );
    const notoEmojiMono =
        (JSON.parse(monoMeta) as { lastModified?: string }).lastModified ?? '?';
    return { unicodeEmoji, notoColorEmoji, notoEmojiMono };
}

function reportVersions(bundled: Versions, upstream: Upstream): boolean {
    const rows: [string, string | null, string][] = [
        [
            'Unicode Emoji (codes + names)',
            bundled.unicodeEmoji,
            upstream.unicodeEmoji,
        ],
        [
            'Noto Color Emoji (font glyphs)',
            bundled.notoColorEmoji,
            upstream.notoColorEmoji,
        ],
        [
            'Noto Emoji (mono, last updated)',
            bundled.notoEmojiMono,
            upstream.notoEmojiMono,
        ],
    ];
    let stale = false;
    console.log('\n  component                        bundled        upstream');
    console.log('  ' + '-'.repeat(62));
    for (const [name, have, want] of rows) {
        const behind = have === null || have !== want;
        if (behind) stale = true;
        console.log(
            `  ${name.padEnd(32)} ${String(have ?? '(unpinned)').padEnd(14)} ${want}${behind ? '   ⬆ update available' : ''}`,
        );
    }
    console.log('');
    return stale;
}

function requirePrereqs(): void {
    const missing = ['python3', 'pip3', 'git'].filter((cmd) => {
        try {
            execFileSync(cmd, ['--version'], { stdio: 'ignore' });
            return false;
        } catch {
            return true;
        }
    });
    if (missing.length > 0) {
        console.error(
            `Missing prerequisites for the fonts half: ${missing.join(', ')}. ` +
                'Install them (e.g. `brew install python`) and re-run, or use --names-only.',
        );
        process.exit(1);
    }
}

function step(label: string): void {
    console.log(`\n\x1b[1m▶ ${label}\x1b[0m`);
}

function npmRun(script: string, ...rest: string[]): void {
    execFileSync('npm', ['run', script, ...rest], { stdio: 'inherit' });
}

function safariChecklist(): void {
    console.log(
        [
            '',
            '\x1b[1m✋ Safari visual QA (the one step a script can’t do)\x1b[0m',
            '  There is no headless Safari and OT-SVG subset correctness must be',
            '  eyeballed. Before committing, open a project in Safari (and a',
            '  WebKit/iPad build) and confirm:',
            '   • only the matching NotoColorEmoji.svg-N.ttf slices download (not the',
            '     whole ~3.3 MB font),',
            '   • plain ZWJ sequences (families, professions, flags), skin-tone',
            '     modifiers, and keycaps (2️⃣ #️⃣ ©️) all render with no tofu,',
            '   • cross-check coverage against the Chromium build.',
            '',
            `  Then update the "updated" date in ${VERSIONS} and commit:`,
            '   static/unicode/*.txt, static/locales/*/*-emojis.json,',
            '   static/fonts/NotoEmoji/NotoEmoji-400.woff2, static/fonts/NotoColorEmoji/*,',
            '   src/basis/faces/emoji-faces.css, the regenerated',
            '   faces/renderable/lockfile artifacts, and versions.json.',
            '',
        ].join('\n'),
    );
}

async function main(): Promise<void> {
    const bundled = readVersions();
    const upstream = await upstreamVersions();
    const stale = reportVersions(bundled, upstream);

    if (checkOnly) {
        console.log(
            stale
                ? 'An update is available. Run `npm run emoji-update` to apply it.'
                : 'Bundled emoji sources are up to date.',
        );
        return;
    }

    const doNames = !fontsOnly;
    const doFonts = !namesOnly;
    if (doFonts) requirePrereqs();

    // Fonts run FIRST: codes.txt is filtered to the renderable set that
    // fonts-fix (re)generates, so codes.txt depends on the fonts. Order is
    // therefore fonts → codes → names → verify, NOT the A→E reading order.
    if (doFonts) {
        step(
            'Fonts (1): refreshing the monochrome Noto Emoji font (Google Fonts download endpoint)',
        );
        execFileSync('bash', ['scripts/emoji/download-mono-emoji.sh'], {
            stdio: 'inherit',
        });
        step(
            'Fonts (2): fetching Google’s Noto Color Emoji slices + regenerating both color CSS branches and the mono range',
        );
        execFileSync('npx', ['tsx', 'scripts/emoji/downloadColorEmoji.ts'], {
            stdio: 'inherit',
        });
        step(
            'Fonts (3): rebuilding + re-slicing the Safari SVG font (nanoemoji, ~10 min)',
        );
        execFileSync('bash', ['scripts/emoji/notocolor.sh'], {
            stdio: 'inherit',
        });
        step(
            'Fonts (4): folding the rebuilt font’s SVG-only gap codepoints into the Safari CSS',
        );
        execFileSync(
            'npx',
            [
                'tsx',
                'scripts/emoji/downloadColorEmoji.ts',
                '--fold-safari-gaps',
            ],
            { stdio: 'inherit' },
        );
        step(
            'Fonts (5): regenerating font artifacts (faces/css/renderable/lockfile)',
        );
        npmRun('fonts-fix');
    }

    // codes.txt depends on BOTH the Unicode tables (names) and the renderable
    // set (fonts, via the isCodepointRenderable filter), so regenerate it
    // whenever either changed — always AFTER fonts-fix.
    if (doNames || doFonts) {
        step(
            'Codes: regenerating codes.txt + glyph-names.txt (filtered to renderable glyphs)',
        );
        npmRun('codes');
    }
    if (doNames) {
        step('Names: regenerating {locale}-emojis.json from CLDR');
        npmRun('locales-emojis');
    }

    if (doFonts) {
        step('Verify: no font drift / over-claim + emoji & fallback guards');
        npmRun('fonts', '--', '--deep');
        execFileSync('npx', ['vitest', 'run', 'src/basis/faces'], {
            stdio: 'inherit',
        });
    }

    // Record the versions we just applied (maintainer confirms `updated`).
    // codes.txt — and thus its Unicode version — is regenerated whenever names
    // OR fonts change (the renderable filter couples it to the fonts), so pin
    // the Unicode version whenever codes actually ran, not just on --names.
    const next: Versions = {
        ...bundled,
        unicodeEmoji:
            doNames || doFonts ? upstream.unicodeEmoji : bundled.unicodeEmoji,
        notoColorEmoji: doFonts
            ? upstream.notoColorEmoji
            : bundled.notoColorEmoji,
        notoEmojiMono: doFonts ? upstream.notoEmojiMono : bundled.notoEmojiMono,
    };
    fs.writeFileSync(VERSIONS, JSON.stringify(next, null, 4) + '\n');
    console.log(`\nUpdated ${VERSIONS}.`);

    if (doFonts) safariChecklist();
}

main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
});
