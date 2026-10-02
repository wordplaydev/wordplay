/**
 * Undo the first-use links a glossary term's word collected where that word is
 * an everyday word, and queue the word to be chosen again.
 *
 * The one-off repair for what `findHomographTerms` now prevents: `how` means a
 * how-to guide, but 13 locales translated it as the question word, and the
 * linker turned hundreds of ordinary "How…?" sentences into `@how`. It walks
 * each named locale's strings (glossary definitions included) and both
 * tutorials, restores the word wherever en-US has no `@<id>` at the same place,
 * and marks the locale's word `$!` so no linker relinks it before a better one
 * is chosen. Unlinking has to come first: `@how` renders as whatever the word
 * currently is, so choosing the new word first would put "guia prático" into
 * every sentence that used to say "como".
 *
 * Run: npx tsx src/util/verify-locales/unlinkGlossaryTerm.ts how pt-PT pl-PL …
 */
import fs from 'fs';
import { Revised } from '#locale/Annotations.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import { isRecord } from '#util/guards.ts';
import Log from '#util/verify-locales/Log.ts';
import { readLocale, writeLocale } from '#util/verify-locales/localeFiles.ts';
import { getTutorialPath } from '#util/verify-locales/TutorialSchema.ts';
import writeFormatted from '#util/verify-locales/writeFormatted.ts';
import { unlinkReference } from '#util/verify-locales/glossaryLinks.ts';
import { escapeRegExp } from '#util/verify-locales/markupText.ts';
import { TutorialModes } from '../../tutorial/TutorialMode';

/** This script's feedback, shaped like the rest of the locale tooling. */
const log: Log = new Log(false);

/** A JSON file's contents, untyped until something narrows them. */
function readJSONFile(file: string): unknown {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed;
}

/** The value at `path` in `root`, or undefined if the path leaves it. */
function at(root: unknown, path: readonly (string | number)[]): unknown {
    let node = root;
    for (const key of path) {
        if (Array.isArray(node) && typeof key === 'number') node = node[key];
        else if (isRecord(node) && typeof key === 'string') node = node[key];
        else return undefined;
    }
    return node;
}

/**
 * Unlink every string under `node` in place, skipping any whose en-US
 * counterpart at the same path links the term itself. Returns how many strings
 * changed.
 */
function walk(
    node: unknown,
    english: unknown,
    path: (string | number)[],
    unlink: (text: string) => string,
    linked: RegExp,
): number {
    let changed = 0;
    const visit = (
        value: unknown,
        key: string | number,
        set: (v: string) => void,
    ) => {
        const here = [...path, key];
        if (typeof value === 'string') {
            const source = at(english, here);
            if (typeof source === 'string' && linked.test(source)) return;
            const revised = unlink(value);
            if (revised !== value) {
                set(revised);
                changed++;
            }
        } else changed += walk(value, english, here, unlink, linked);
    };
    if (Array.isArray(node))
        node.forEach((value, index) =>
            visit(value, index, (v) => (node[index] = v)),
        );
    else if (isRecord(node))
        for (const [key, value] of Object.entries(node))
            visit(value, key, (v) => (node[key] = v));
    return changed;
}

const [id, ...locales] = process.argv.slice(2);
if (id === undefined || locales.length === 0) {
    log.bad('Usage: unlinkGlossaryTerm.ts <glossary id> <locale> [<locale>…]');
    process.exit(1);
}

const english = readLocale(log, 'en-US');
// Only a term en-US actually defines, so the argument names a glossary id and
// nothing else; it is escaped below all the same, since it becomes a pattern.
const glossary = at(english, ['glossary']);
if (!isRecord(glossary) || !(id in glossary)) {
    log.bad(`"${id}" is not a glossary term in en-US.`);
    process.exit(1);
}
const linked = new RegExp(
    `@${escapeRegExp(id)}(?![\\p{L}\\p{N}])(?![./][\\p{L}\\p{N}])`,
    'u',
);
const englishTutorials = new Map(
    TutorialModes.map((mode) => [
        mode,
        readJSONFile(getTutorialPath('en-US', mode)),
    ]),
);

for (const locale of locales) {
    const localeLog = log.scope(locale);
    const text = readLocale(localeLog, locale);
    if (!isRecord(text)) {
        localeLog.bad('Could not read this locale.');
        continue;
    }
    const entry = at(text, ['glossary', id]);
    if (!isRecord(entry) || typeof entry['word'] !== 'string') {
        localeLog.bad(`This locale has no glossary word for "${id}".`);
        continue;
    }
    const word = withoutAnnotations(entry['word']);
    const language =
        typeof text['language'] === 'string' ? text['language'] : 'en';
    const unlink = (value: string) =>
        unlinkReference(value, id, word, language);

    const inLocale = walk(text, english, [], unlink, linked);
    // Queue the word to be chosen again, keeping it so the reader still has one.
    entry['word'] = `${Revised}${word}`;
    await writeLocale(localeLog, locale, text);

    let inTutorials = 0;
    for (const mode of TutorialModes) {
        const file = getTutorialPath(locale, mode);
        if (!fs.existsSync(file)) continue;
        const tutorial = readJSONFile(file);
        const changed = walk(
            tutorial,
            englishTutorials.get(mode),
            [],
            unlink,
            linked,
        );
        if (changed > 0) {
            await writeFormatted(file, JSON.stringify(tutorial, null, 4));
            inTutorials += changed;
        }
    }
    localeLog.good(
        `Restored "${word}" in ${inLocale} locale string(s) and ${inTutorials} tutorial string(s), and queued the word for a new choice.`,
    );
}
