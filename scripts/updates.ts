// Converts the CHANGELOG into a JSON file for use in the app to render release notes.

import fs from 'fs';
import path from 'path';

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const outputPath = path.join(
    process.cwd(),
    'src',
    'routes',
    '[[locale]]',
    'updates',
    'updates.json',
);
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
export type SectionKind = 'added' | 'changed' | 'fixed' | 'removed';

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
// - `<emoji> text` (single extended pictographic grapheme + space) -> emoji entry
// - otherwise -> plain text (legacy)
const emojiGrapheme =
    /^\p{Extended_Pictographic}(\u{FE0F}|\u{200D}\p{Extended_Pictographic})*$/u;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function parseEntry(body: string): Entry {
    const [first] = segmenter.segment(body);
    if (first && emojiGrapheme.test(first.segment)) {
        const rest = body.slice(first.segment.length);
        if (rest.startsWith(' ')) {
            return {
                text: rest.trim(),
                emoji: first.segment,
            };
        }
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
        const text = proseBuffer.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

        const typeofChangeMatch = line.match(
            /^### (Added|Fixed|Changed|Removed)$/,
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

// Only run the script body when executed directly (e.g. via
// `npx tsx scripts/updates.ts`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Parsing changelog...');

    const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
    const updates = parseChangelog(changelogContent);
    fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2), 'utf-8');

    fs.writeFileSync(
        datePath,
        JSON.stringify({ date: updates[0]?.date ?? null }, null, 2),
        'utf-8',
    );

    console.log(`Saved JSON to ${outputPath}`);
}
