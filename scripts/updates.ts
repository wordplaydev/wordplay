// Converts the CHANGELOG into a JSON file for use in the app to render release notes.
//
// The bundle this writes is the *structural* half of the updates page: version,
// date, section, emoji marker, and each entry's text already converted to
// Wordplay markup. The translated half lives in one map per locale
// (static/locales/<code>/<code>-updates.json), keyed by the `id` this assigns,
// so structure is stored once and a missing translation falls back per entry.

import {
    UpdateSectionKinds,
    type UpdateEntry,
    type UpdateSectionKind,
    type UpdateText,
    type UpdatesBundle,
} from '@locale/UpdatesBundle';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

/** The structural bundle, fetched by the updates page rather than bundled into
 *  it — a static import put 327KB into the prerendered page for every locale. */
const outputPath = path.join(process.cwd(), 'static', 'updates.json');
const datePath = path.join(
    process.cwd(),
    'src',
    'routes',
    '[[locale]]',
    'updates',
    'date.json',
);

/** A single bullet under a section: optional emoji marker + body text. */
export type Entry = { text: string; emoji: string | null };

/** The four CHANGELOG section headings we recognize. */
export type SectionKind = UpdateSectionKind;

/** Per-section data for one release: the bullets and an optional trailing
 *  summary paragraph that appears beneath the bullets in CHANGELOG.md. */
export type Update = {
    version: string;
    date: string | null;
    /** Free-form intro prose between the `## version` line and the first
     *  `###` heading. Empty string when absent. */
    summary: string;
    changes: Record<SectionKind, Entry[]>;
    /** Free-form trailing prose for each section. Empty string when absent. */
    summaries: Record<SectionKind, string>;
};

// Splits a bullet body into { text, emoji }.
// - `<marker> text` (a single marker grapheme + space) -> emoji entry
// - otherwise -> plain text (legacy)
//
// A "marker" is the first grapheme cluster when it is immediately followed by a
// space and is not an ordinary word character. We can't restrict markers to
// emoji (e.g. \p{Extended_Pictographic}), because the changelog also uses
// symbols (`›`, `¶`) and even letters from other scripts (`요`) as icons. So we
// instead exclude only ASCII word characters, which is what ordinary prose
// bullets start with (e.g. "We added…", "A new feature…").
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function parseEntry(body: string): Entry {
    const [first] = segmenter.segment(body);
    if (
        first &&
        body.charAt(first.segment.length) === ' ' &&
        !/^[A-Za-z0-9]/.test(first.segment)
    ) {
        return {
            text: body.slice(first.segment.length).trim(),
            emoji: first.segment,
        };
    }
    return { text: body, emoji: null };
}

const SectionHeadings: Record<string, SectionKind> = {
    Added: 'added',
    Changed: 'changed',
    Fixed: 'fixed',
    Removed: 'removed',
};

export function parseChangelog(changelog: string): Update[] {
    const lines = changelog.split('\n');
    const updates: Update[] = [];
    let currentType: SectionKind | null = null;
    let currentUpdate: Update | null = null;

    // Prose lines that appear between structural markers (after a `##`
    // version or `###` section heading, between or after bullets) are
    // attributed to whatever block they sit in. We buffer them line-by-
    // line so multi-line prose joins into one paragraph, with blank lines
    // preserved as `\n\n` so the renderer can treat them as paragraph
    // breaks.
    let proseBuffer: string[] = [];
    const flushProse = () => {
        if (proseBuffer.length === 0) return;
        const text = proseBuffer
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        proseBuffer = [];
        if (text === '' || currentUpdate === null) return;
        if (currentType === null) {
            // Before any `###` heading — belongs to the version's intro.
            currentUpdate.summary = text;
        } else {
            // Within or after a section — belongs to that section.
            currentUpdate.summaries[currentType] = text;
        }
    };

    lines.forEach((line) => {
        const versionMatch =
            line.match(/^## (\d+\.\d+\.\d+) - (\d{4}-\d{2}-\d{2})$/) ??
            line.match(/^## (\d+\.\d+\.\d+)$/);

        // Accept 1–3 leading `#` so a mistyped heading (e.g. `# Added` instead
        // of `### Added`) still registers as a section rather than silently
        // becoming prose. The four reserved words can't collide with the
        // `# Change Log` title or a `## version` line.
        const typeofChangeMatch = line.match(
            /^#{1,3} (Added|Fixed|Changed|Removed)$/,
        );
        if (typeofChangeMatch) {
            flushProse();
            currentType = SectionHeadings[typeofChangeMatch[1]];
        } else if (versionMatch) {
            flushProse();
            const version = versionMatch[1];
            const date = versionMatch[2] ?? null;

            // Save the previous update before starting a new one
            if (currentUpdate) {
                updates.push(currentUpdate);
            }
            currentType = null;
            currentUpdate = {
                version,
                date,
                summary: '',
                changes: { added: [], fixed: [], changed: [], removed: [] },
                summaries: { added: '', fixed: '', changed: '', removed: '' },
            };
        } else if (currentUpdate && currentType && line.startsWith('- ')) {
            // Bullets are structural — emit any pending prose first so it
            // attaches to whichever block it belongs to, not to the next.
            flushProse();
            currentUpdate.changes[currentType].push(
                parseEntry(line.substring(2).trim()),
            );
        } else if (currentUpdate) {
            // Either a non-bullet line of prose, or a blank line. Buffer it
            // so multi-paragraph summaries can survive (blank lines become
            // `\n\n` paragraph breaks).
            proseBuffer.push(line);
        }
    });

    flushProse();
    if (currentUpdate) {
        updates.push(currentUpdate);
    }

    return updates;
}

/**
 * Convert a CHANGELOG bullet's Markdown into Wordplay markup.
 *
 * Markdown-style substitutions (`**`, `_`, `[…](…)`, `#N`) must NOT rewrite
 * content inside backticks — `en_us` should round-trip unchanged. Pull every
 * backtick span out into a placeholder first, apply the prose transforms, then
 * restore each span as a Wordplay Example (`\…\`).
 *
 * This runs at build time rather than at render, so the markup an entry is
 * translated from is the same markup the page shows, and the translator's
 * markup validators apply to it unchanged.
 */
export function toMarkup(text: string): string {
    // Two kinds of span are pulled out before the prose transforms run and put
    // back after, because the transforms must not rewrite their contents.
    const CODE = '\uE000';
    const URL = '\uE001';
    const code: string[] = [];
    const urls: string[] = [];

    // `en_us` inside backticks must round-trip unchanged, so code spans come out
    // first and go back last, as Wordplay Examples (`\…\`).
    let body = text.replaceAll(/`(.+?)`/g, (_, span) => {
        code.push(span);
        return `${CODE}${code.length - 1}${CODE}`;
    });

    // A link's target is not prose. Escaping `/` before this ran turned every
    // `[About](https://wordplay.dev/about)` into `https:////wordplay.dev//about`
    // — a mangled href on every Markdown link the page has ever shown. Emitting
    // the link syntax now and masking only the URL leaves the *label* in the
    // prose, where the emphasis and escaping transforms still apply to it.
    body = body.replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        urls.push(url);
        return `<${label}@${URL}${urls.length - 1}${URL}>`;
    });

    body = body
        // Escape literals of any markup symbol that we'll later *introduce* via
        // a substitution below, so a stray copy in the source can't accidentally
        // trigger that markup. Wordplay markup escapes specials by doubling them
        // — see `unescapeMarkupSymbols`. Order matters: do these *before* the
        // substitutions that emit those symbols.
        //
        // `\` — guards against a runaway Example when code spans are restored
        //   as `\…\`.
        // `/` — `_` → `/` italics conversion runs below; without escaping, a
        //   literal `/` (e.g., in paths or ratios) becomes an italic marker.
        .replaceAll('\\', '\\\\')
        .replaceAll('/', '//')
        .replaceAll('**', '*')
        .replaceAll('_', '/')
        // Generated after the escaping, so this URL is already correct.
        .replaceAll(
            /#([0-9]+)/g,
            '<$1@https://github.com/wordplaydev/wordplay/issues/$1>',
        );

    return body
        .replaceAll(
            new RegExp(`${URL}(\\d+)${URL}`, 'g'),
            (_, index) => urls[Number(index)],
        )
        .replaceAll(
            new RegExp(`${CODE}(\\d+)${CODE}`, 'g'),
            (_, index) => `\\${code[Number(index)]}\\`,
        );
}

/**
 * A stable id for one piece of changelog prose, used as the key a translation
 * is stored under. Two properties are load-bearing.
 *
 * It hashes the **Markdown source**, not the converted markup, so improving
 * `toMarkup` doesn't invalidate every translation ever bought. Bump
 * `BundleFormat` when you do want that.
 *
 * It never starts with a digit, because `parseOverrideKey` reads a trailing
 * all-digit segment of an override key as an array index — an id of `12345`
 * would be misread as `updates[12345]` and the edit silently discarded.
 */
export function textId(markdown: string): string {
    return (
        'e' + createHash('sha256').update(markdown).digest('hex').slice(0, 12)
    );
}

/** Bumping this invalidates every stored translation, so only do it when the
 *  markup `toMarkup` produces has changed in a way translations must follow. */
export const BundleFormat = 1;

function toText(markdown: string): UpdateText | null {
    const trimmed = markdown.trim();
    if (trimmed === '') return null;
    return { id: textId(trimmed), markup: toMarkup(trimmed) };
}

/** Turn parsed CHANGELOG updates into the bundle the app fetches. */
export function toBundle(updates: Update[]): UpdatesBundle {
    return {
        format: BundleFormat,
        updates: updates.map((update) => ({
            version: update.version,
            date: update.date,
            summary: toText(update.summary),
            changes: Object.fromEntries(
                UpdateSectionKinds.map((kind) => [
                    kind,
                    update.changes[kind].map((entry) => ({
                        ...(toText(entry.text) ?? {
                            id: textId(entry.text),
                            markup: '',
                        }),
                        emoji: entry.emoji,
                    })),
                ]),
            ) as Record<UpdateSectionKind, UpdateEntry[]>,
            summaries: Object.fromEntries(
                UpdateSectionKinds.map((kind) => [
                    kind,
                    toText(update.summaries[kind]),
                ]),
            ) as Record<UpdateSectionKind, UpdateText | null>,
        })),
    };
}

// Only run the script body when executed directly (e.g. via
// `npx tsx scripts/updates.ts`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Parsing changelog...');

    const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    const updates = parseChangelog(changelogContent);
    fs.writeFileSync(
        outputPath,
        JSON.stringify(toBundle(updates), null, 2),
        'utf-8',
    );

    fs.writeFileSync(
        datePath,
        JSON.stringify({ date: updates[0]?.date ?? null }, null, 2),
        'utf-8',
    );

    console.log(`Saved JSON to ${outputPath}`);
}
