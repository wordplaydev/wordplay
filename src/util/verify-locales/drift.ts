/**
 * Detect translations that have gone stale relative to en-US (#1144).
 *
 * The repo can already *fix* a stale string — a `$!` (`Revised`) marker queues it
 * for re-translation and `translate.yml` runs the pipeline — but nothing detects
 * that a string went stale, so `$!` has to be typed by hand and almost never is.
 * Meanwhile in-place edits to existing en-US keys land in about half of all en-US
 * commits, and the translate pipeline leaves a few percent of them unpropagated
 * each time.
 *
 * Git already records the answer exactly: a locale string whose en-US source last
 * changed *after* the translation last changed is describing older English. That
 * needs no stored baseline, no committed artifact, and no machine translation —
 * just a walk of each file's history, which takes about a second per file.
 *
 * Deliberately compares at *pair* granularity (`LocalePath.toString()`), not per
 * array element, because that is the granularity `LocalePath.repair` writes at.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { MachineTranslated, Revised, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import {
    classifyPair,
    type LocaleStringKind,
} from '@util/verify-locales/classifyLocalePath';
import type LocalePath from '@util/verify-locales/LocalePath';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import { getTutorialPath } from '@util/verify-locales/TutorialSchema';
import { TutorialModes, type TutorialMode } from '../../tutorial/TutorialMode';
import type Log from '@util/verify-locales/Log';
import { getCheckableLocalePairs } from '@util/verify-locales/verifyLocale';
import { mismatchedConceptLinks } from '@util/verify-locales/protect';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { getTranslatableTutorialPairs } from '@util/verify-locales/verifyTutorial';
import type Tutorial from '../../tutorial/Tutorial';

/** When a path's value last changed, and what it changed from. */
export type Change = {
    time: number;
    /**
     * The commit's position in `git rev-list --topo-order HEAD` (0 is the most
     * recent), and what staleness compares — not `time`. Committer dates are
     * not monotonic along the DAG: a commit written on a branch in May and
     * merged in June keeps its May date, so date order would call a translation
     * older than an en-US edit it actually postdates. `time` is for the report.
     */
    order: number;
    sha: string;
    previous?: string;
};

/** A translation whose en-US source moved after the translation last did. */
export type Stale = {
    locale: string;
    file: string;
    /** `LocalePath.toString()` of the drifted pair. */
    id: string;
    kind: LocaleStringKind;
    /** Whether the current translation is machine output (`$~`). */
    machine: boolean;
    source: Change;
    target: Change;
    /** Current en-US value, and the locale's current value. */
    english: string;
    translation: string;
};

/** Strip a single leading write-status marker so a marker change never reads as
 *  a content change. */
export function withoutLeadingAnnotation(text: string): string {
    for (const marker of [Unwritten, Revised, MachineTranslated])
        if (text.startsWith(marker)) return text.slice(marker.length);
    return text;
}

/** Queue a string for re-translation, replacing whatever write-status it had. */
function requeue(text: string): string {
    return `${Revised}${text.replace(/^(?:\$[?!~])+/, '')}`;
}

/** Canonical, comparable form of a pair's value. */
function canonicalize(value: string | string[]): string {
    return JSON.stringify(
        typeof value === 'string'
            ? withoutLeadingAnnotation(value)
            : value.map(withoutLeadingAnnotation),
    );
}

/**
 * Flatten a locale-shaped object to `LocalePath.toString()` → canonical value.
 *
 * This mirrors `getKeyTemplatePairs`'s path semantics without allocating a
 * `LocalePath` per pair, because it runs once per version of a file and there
 * are hundreds of versions. `drift.test.ts` pins it to `getKeyTemplatePairs` so
 * the two can't drift apart.
 */
export function collectValues(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: Record<any, any>,
    into: Map<string, string> = new Map(),
    /** `path.join('.')` of the ancestors — '' at the top, matching `LocalePath`. */
    prefix = '',
): Map<string, string> {
    for (const unparsedKey of Object.keys(record)) {
        const parsedKey = parseInt(unparsedKey);
        const key = !isNaN(parsedKey) ? parsedKey : unparsedKey;
        const value = record[key];
        const id = `${prefix}.${key}`;
        const childPrefix = prefix === '' ? `${key}` : id;
        if (
            typeof value === 'string' ||
            (Array.isArray(value) && value.every((s) => typeof s === 'string'))
        )
            into.set(id, canonicalize(value));
        else if (
            typeof value === 'object' &&
            value !== undefined &&
            value !== null &&
            !Array.isArray(value)
        )
            collectValues(value, into, childPrefix);
        else if (Array.isArray(value))
            for (let index = 0; index < value.length; index++) {
                const element = value[index];
                if (element)
                    collectValues(element, into, `${childPrefix}.${index}`);
            }
    }
    return into;
}

/** A commit that changed the file, with the blob before and after it. */
type FileCommit = {
    sha: string;
    time: number;
    /** Position in `git rev-list --topo-order HEAD`; 0 is the most recent. */
    order: number;
    /** The blob the parent had, or undefined when this commit added the file. */
    before: string | undefined;
    after: string;
};

const commitOrderCache = new Map<string, Map<string, number>>();

/** Every commit's position in topological order, 0 being the most recent. This
 *  is the only total order over commits that agrees with the DAG; committer
 *  dates do not, since a commit written on a branch keeps its date when merged
 *  later. */
export function commitOrder(cwd?: string): Map<string, number> {
    const cached = commitOrderCache.get(cwd ?? '');
    if (cached !== undefined) return cached;
    const order = new Map<string, number>();
    const list = execFileSync('git', ['rev-list', '--topo-order', 'HEAD'], {
        cwd,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 1024,
    });
    let index = 0;
    for (const sha of list.split('\n')) if (sha !== '') order.set(sha, index++);
    commitOrderCache.set(cwd ?? '', order);
    return order;
}

/** A blob sha of all zeroes means the side doesn't exist — the file was added. */
const EmptyBlob = /^0+$/;

/**
 * Every commit that changed the file, newest first, with the blob on each side.
 *
 * The blob *pair* is the point. Asking "what did this commit change?" by
 * comparing adjacent entries in the log only works if the log is a straight
 * line; across branches, two adjacent entries can differ without either having
 * changed anything relative to its own parent, which invents drift. `--raw`
 * already carries the parent's blob, so the exact per-commit diff is free.
 *
 * `--follow` matters because the locale files were moved twice
 * (`static/locales/en/en.json` → `src/locale/en.json` → `src/locale/en-US.json`).
 */
export function fileCommits(file: string, cwd?: string): FileCommit[] {
    const log = execFileSync(
        'git',
        [
            'log',
            '--follow',
            '--topo-order',
            '--format=C %H %ct',
            '--raw',
            '--',
            file,
        ],
        { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024 },
    );

    const order = commitOrder(cwd);
    const commits: FileCommit[] = [];
    let pending: { sha: string; time: number; order: number } | undefined;
    for (const line of log.split('\n')) {
        if (line.startsWith('C ')) {
            const [, sha, time] = line.split(' ');
            pending = {
                sha,
                time: parseInt(time),
                // A commit off this branch (shouldn't happen when logging from
                // HEAD) sorts as oldest rather than throwing.
                order: order.get(sha) ?? Number.MAX_SAFE_INTEGER,
            };
        } else if (line.startsWith(':') && pending !== undefined) {
            // ":<oldmode> <newmode> <oldsha> <newsha> <status>\t<paths>"
            const match = line.match(/^:\S+ \S+ (\S+) (\S+) /);
            if (match) {
                commits.push({
                    ...pending,
                    before: EmptyBlob.test(match[1]) ? undefined : match[1],
                    after: match[2],
                });
                pending = undefined;
            }
        }
    }
    return commits;
}

/** Read blobs by sha. `--batch` emits "<sha> <type> <size>\n<content>\n", so
 *  content is sliced by byte length rather than split on newlines. */
function readBlobs(shas: string[], cwd?: string): Map<string, string> {
    const texts = new Map<string, string>();
    if (shas.length === 0) return texts;
    const batch = execFileSync('git', ['cat-file', '--batch'], {
        cwd,
        input: shas.join('\n'),
        maxBuffer: 1024 * 1024 * 1024,
    });
    let offset = 0;
    let index = 0;
    while (offset < batch.length && index < shas.length) {
        const newline = batch.indexOf(10, offset);
        if (newline < 0) break;
        const header = batch.toString('utf8', offset, newline).split(' ');
        if (header[1] === 'missing') {
            offset = newline + 1;
            index++;
            continue;
        }
        const size = parseInt(header[2]);
        // Keyed by the sha we asked for, not the one echoed back: `--raw`
        // abbreviates blob shas while `--batch` answers with the full one.
        texts.set(
            shas[index],
            batch.toString('utf8', newline + 1, newline + 1 + size),
        );
        offset = newline + 1 + size + 1;
        index++;
    }
    return texts;
}

/**
 * For each pair in a JSON file, the commit at which its value last changed.
 *
 * Walking newest → oldest, a path's last change is the newest version whose value
 * differs from the version before it. A path that never changed gets the time of
 * the oldest version, so a file's first appearance counts as its authorship.
 */
const historyCache = new Map<string, Map<string, Change>>();

/** Clear the memoized history walks. Only tests need this; a CLI run reads each
 *  file's history once and exits. */
export function clearHistoryCache(): void {
    historyCache.clear();
    commitOrderCache.clear();
}

export function lastChangedTimes(
    file: string,
    cwd?: string,
): Map<string, Change> {
    // The en-US source is compared against every locale, so without memoizing
    // this its history gets walked 29 times.
    const cacheKey = `${cwd ?? ''}\u0000${file}`;
    const cached = historyCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const commits = fileCommits(file, cwd);
    const changed = new Map<string, Change>();
    // Blobs are fetched in chunks so a file with hundreds of half-megabyte
    // versions never has all of them in memory at once. Consecutive commits
    // share a blob (one's `before` is the next one's `after`), so a chunk's
    // unique blob count is about its length.
    const ChunkSize = 100;
    for (let start = 0; start < commits.length; start += ChunkSize) {
        const chunk = commits.slice(start, start + ChunkSize);
        const texts = readBlobs(
            [
                ...new Set(
                    chunk.flatMap((commit) =>
                        commit.before === undefined
                            ? [commit.after]
                            : [commit.before, commit.after],
                    ),
                ),
            ],
            cwd,
        );
        const parsed = new Map<string, Map<string, string>>();
        const valuesOf = (sha: string | undefined): Map<string, string> => {
            if (sha === undefined) return new Map();
            const already = parsed.get(sha);
            if (already !== undefined) return already;
            let values: Map<string, string>;
            try {
                values = collectValues(JSON.parse(texts.get(sha) ?? ''));
            } catch {
                // A malformed version contributes no evidence rather than
                // aborting the walk.
                values = new Map();
            }
            parsed.set(sha, values);
            return values;
        };
        // Newest first, so the first commit to touch a path is its last change.
        for (const commit of chunk) {
            const after = valuesOf(commit.after);
            const before = valuesOf(commit.before);
            for (const [id, value] of after) {
                if (changed.has(id)) continue;
                const previous = before.get(id);
                if (previous === value) continue;
                changed.set(id, {
                    time: commit.time,
                    order: commit.order,
                    sha: commit.sha,
                    ...(previous === undefined ? {} : { previous }),
                });
            }
        }
    }
    withUncommittedChanges(file, changed, cwd);
    historyCache.set(cacheKey, changed);
    return changed;
}

/**
 * Fold uncommitted edits into a file's change record.
 *
 * The history walk only sees commits, so in a dirty working tree a file that was
 * just rewritten still dates to its last commit. That is not a cosmetic problem:
 * right after a translation run — the exact moment someone would re-run this —
 * every freshly translated string looks stale again, and `--mark` would re-queue
 * thousands of strings that were just paid for. A path whose working-tree value
 * differs from HEAD changed more recently than any commit, so it sorts ahead of
 * all of them.
 */
function withUncommittedChanges(
    file: string,
    changed: Map<string, Change>,
    cwd?: string,
): Map<string, Change> {
    let current: Map<string, string>;
    try {
        current = collectValues(
            JSON.parse(
                fs.readFileSync(
                    cwd === undefined ? file : `${cwd}/${file}`,
                    'utf8',
                ),
            ),
        );
    } catch {
        return changed;
    }
    let committed: Map<string, string>;
    try {
        committed = collectValues(
            JSON.parse(
                execFileSync('git', ['show', `HEAD:${file}`], {
                    cwd,
                    encoding: 'utf8',
                    maxBuffer: 1024 * 1024 * 1024,
                    stdio: ['pipe', 'pipe', 'pipe'],
                }),
            ),
        );
    } catch {
        // Not in HEAD at all — the whole file is uncommitted.
        committed = new Map();
    }
    for (const [id, value] of current)
        if (committed.get(id) !== value)
            changed.set(id, {
                time: Math.floor(Date.now() / 1000),
                // Ahead of every commit, since 0 is the most recent one.
                order: -1,
                sha: 'uncommitted',
            });
    return changed;
}

/** The locale directories to check, excluding en-US (the source). */
export function getTranslatedLocales(): string[] {
    return fs
        .readdirSync('static/locales', { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== 'en-US')
        .map((entry) => entry.name)
        .sort();
}

/** The paths worth comparing, and how each should be treated, keyed by
 *  `LocalePath.toString()`. Restricting to `getCheckableLocalePairs` excludes the
 *  fields a locale writes for itself (`guidance`, `terms`, glossary `forms`,
 *  `emotion`) and, because it reads *current* en-US, paths that no longer exist. */
export function getCheckablePathKinds(
    source: LocaleText,
): Map<string, { kind: LocaleStringKind; pair: LocalePath }> {
    const kinds = new Map<
        string,
        { kind: LocaleStringKind; pair: LocalePath }
    >();
    for (const pair of getCheckableLocalePairs(source))
        kinds.set(pair.toString(), { kind: classifyPair(pair), pair });
    return kinds;
}

/**
 * The same for a tutorial, whose shape is nothing like a locale's: a dialog line
 * is a `[concept, emotion, …text]` tuple, so only index 2 and up is translatable.
 * `getTranslatableTutorialPairs` is the tutorial's own answer to that question,
 * and reusing it is what keeps this from marking an emotion as needing
 * translation.
 */
export function getTranslatableTutorialPathKinds(
    tutorial: Tutorial,
): Map<string, { kind: LocaleStringKind; pair: LocalePath }> {
    const kinds = new Map<
        string,
        { kind: LocaleStringKind; pair: LocalePath }
    >();
    for (const pair of getTranslatableTutorialPairs(tutorial))
        // Dialog is Wordplay markup; titles and subtitles are plain labels.
        kinds.set(pair.toString(), {
            kind: typeof pair.key === 'number' ? 'markup' : 'plain',
            pair,
        });
    return kinds;
}

/** Whether a value already carries a marker that queues it for translation, in
 *  which case marking it again would stack markers for no gain. */
function alreadyQueued(value: string | string[]): boolean {
    const first = typeof value === 'string' ? value : value[0];
    return (
        first !== undefined &&
        (first.startsWith(Unwritten) || first.startsWith(Revised))
    );
}

function isMachine(value: string | string[]): boolean {
    const first = typeof value === 'string' ? value : value[0];
    return first !== undefined && first.startsWith(MachineTranslated);
}

function preview(value: string | string[] | undefined): string {
    if (value === undefined) return '';
    const text = typeof value === 'string' ? value : value.join(' ');
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

/**
 * Compare one locale file against its en-US source.
 *
 * A pair is stale when en-US's last content change is strictly *newer* than the
 * locale's, in topological commit order. Ties are not stale, and that is what
 * keeps the signal clean: when the fixer restructures a tutorial, en-US and every
 * locale change in the same commit, so shifted array indices cancel out instead
 * of flagging everything after them.
 */
export function compareFile(
    locale: string,
    sourceFile: string,
    targetFile: string,
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    sourceText: Record<string, unknown>,
    targetText: Record<string, unknown>,
    /** Repo root, for tests that build history in a throwaway repo. */
    cwd?: string,
): Stale[] {
    const source = lastChangedTimes(sourceFile, cwd);
    const target = lastChangedTimes(targetFile, cwd);
    const stale: Stale[] = [];
    for (const [id, sourceChange] of source) {
        const entry = kinds.get(id);
        if (entry === undefined) continue;
        const targetChange = target.get(id);
        if (targetChange === undefined) continue;
        // Lower order is more recent, so en-US moved later when its order is
        // strictly smaller. Equal orders mean the same commit — not stale.
        if (sourceChange.order >= targetChange.order) continue;
        const translation = entry.pair.resolve(targetText);
        if (translation === undefined) continue;
        if (alreadyQueued(translation)) continue;
        stale.push({
            locale,
            file: targetFile,
            id,
            kind: entry.kind,
            machine: isMachine(translation),
            source: sourceChange,
            target: targetChange,
            english: preview(entry.pair.resolve(sourceText)),
            translation: preview(translation),
        });
    }
    return stale;
}

/** Read and parse a locale-shaped JSON file, or undefined if it isn't there. */
export function readJSON<T = Record<string, unknown>>(
    file: string,
): T | undefined {
    if (!fs.existsSync(file)) return undefined;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return undefined;
    }
}

/**
 * One tutorial mode's en-US document and the path kinds derived from it.
 *
 * There is one of these per mode rather than one merged map, because the two
 * tutorials are different documents whose path ids collide:
 * `acts.0.scenes.0.lines.0.2` exists in both and means different text. Merging
 * them would resolve a `LocalePath` against the wrong file.
 */
export type TutorialSource = {
    mode: TutorialMode;
    source: Record<string, unknown>;
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>;
};

/** Read every tutorial mode's en-US document and classify its paths. A mode
 *  whose file is missing is skipped rather than failing the run. */
export function getTutorialSources(): TutorialSource[] {
    const sources: TutorialSource[] = [];
    for (const mode of TutorialModes) {
        const source = readJSON<Tutorial>(getTutorialPath('en-US', mode));
        if (source === undefined) continue;
        sources.push({
            mode,
            source: source as unknown as Record<string, unknown>,
            kinds: getTranslatableTutorialPathKinds(source),
        });
    }
    return sources;
}

/** Run the census for one locale across its locale file and every tutorial mode. */
export function censusLocale(
    locale: string,
    localeKinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    tutorials: TutorialSource[],
    sourceLocale: Record<string, unknown>,
): Stale[] {
    const stale: Stale[] = [];
    const localeText = readJSON(getLocalePath(locale));
    if (localeText !== undefined)
        stale.push(
            ...compareFile(
                locale,
                getLocalePath('en-US'),
                getLocalePath(locale),
                localeKinds,
                sourceLocale,
                localeText,
            ),
        );
    for (const { mode, source, kinds } of tutorials) {
        const tutorialText = readJSON(getTutorialPath(locale, mode));
        if (tutorialText === undefined) continue;
        stale.push(
            ...compareFile(
                locale,
                getTutorialPath('en-US', mode),
                getTutorialPath(locale, mode),
                kinds,
                source,
                tutorialText,
            ),
        );
    }
    return stale;
}

/**
 * Whether a stale entry should be marked for re-translation.
 *
 * `name`-kind paths are reported but never marked: machine-retranslating names is
 * the known way to produce the cross-locale collisions `checkGlobalNames` rejects,
 * and there are few enough of them to review by hand.
 */
export function isMarkable(entry: Stale, onlyMachine: boolean): boolean {
    if (entry.kind === 'name') return false;
    if (onlyMachine && !entry.machine) return false;
    return true;
}

/**
 * Stamp `$!` on the stale translations in one file.
 *
 * The marker goes on the *locale's* string, never en-US. An en-US `$!` resets
 * every sibling locale at that path, but drift is per-locale; a `$!` on a
 * translated string re-translates just that string. It also avoids the en-US
 * marker-stripping step, which only runs on full non-focal runs and races under
 * `batch.ts`. The translator consumes the marker by overwriting the value with
 * `$~<translation>`, so nothing has to clean it up afterwards.
 */
export function markStale(
    entries: Stale[],
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    text: Record<string, unknown>,
): number {
    let marked = 0;
    for (const entry of entries) {
        const pair = kinds.get(entry.id)?.pair;
        if (pair === undefined) continue;
        const value = pair.resolve(text);
        if (value === undefined || alreadyQueued(value)) continue;
        // Replace the existing write-status rather than stacking onto it: a
        // markup array is one document with exactly one marker, on its first
        // element (`checkStringArrays`), and `Locales.get` reads no further.
        pair.repair(
            text,
            typeof value === 'string'
                ? requeue(value)
                : value.map((element, index) =>
                      index === 0 ? requeue(element) : element,
                  ),
        );
        marked++;
    }
    return marked;
}

/**
 * The commit a branch diverged from, for scoping "what drift did I introduce?".
 *
 * Returns undefined when there is nothing to compare against — a shallow clone,
 * a repo without `origin/main`, or no git at all — so callers report nothing
 * rather than failing. CI's own gate passes an explicit base instead.
 */
export function getDriftBase(cwd?: string): string | undefined {
    for (const ref of ['origin/main', 'main']) {
        try {
            return execFileSync('git', ['merge-base', 'HEAD', ref], {
                cwd,
                encoding: 'utf8',
                maxBuffer: 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe'],
            }).trim();
        } catch {
            continue;
        }
    }
    return undefined;
}

/** Pass as a revision to read the working tree instead of a commit. */
export const WorkingTree = 'WORKTREE';

/** A file's pair values at a revision, or in the working tree. */
export function valuesAt(
    revision: string,
    file: string,
    cwd?: string,
): Map<string, string> | undefined {
    try {
        const text =
            revision === WorkingTree
                ? fs.readFileSync(
                      cwd === undefined ? file : `${cwd}/${file}`,
                      'utf8',
                  )
                : execFileSync('git', ['show', `${revision}:${file}`], {
                      cwd,
                      encoding: 'utf8',
                      maxBuffer: 1024 * 1024 * 1024,
                      // Capture git's stderr rather than letting a missing
                      // revision print "fatal:" over the caller's output.
                      stdio: ['pipe', 'pipe', 'pipe'],
                  });
        return collectValues(JSON.parse(text));
    } catch {
        // No such revision or no such file means nothing to compare.
        return undefined;
    }
}

/**
 * Strings whose `@Concept` links no longer match their en-US source.
 *
 * A separate failure from drift, found while chasing it: a translation that
 * turned `@value` into the plain word "value" still *reads* fine and still
 * passes `checkDocContent`, which only verifies that the links a doc has
 * resolve — not that the ones its source had survived. So the reader silently
 * loses the link. 4,183 strings were in that state before the modern
 * translator started masking links and refusing to alter them; re-translating
 * repairs them, so they only need queueing.
 */
export function findLostConceptLinks(
    locale: string,
    file: string,
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    sourceText: Record<string, unknown>,
    targetText: Record<string, unknown>,
): Stale[] {
    const join = (value: string | string[] | undefined) =>
        value === undefined
            ? ''
            : withoutAnnotations(
                  Array.isArray(value) ? value.join('\n\n') : value,
              );
    const lost: Stale[] = [];
    for (const [id, { kind, pair }] of kinds) {
        // Names hold identifiers, never markup with links.
        if (kind === 'name') continue;
        const source = join(pair.resolve(sourceText));
        if (!source.includes('@')) continue;
        const current = pair.resolve(targetText);
        if (current === undefined || alreadyQueued(current)) continue;
        const target = join(current);
        if (target === '') continue;
        const link = mismatchedConceptLinks(source, target);
        if (link === undefined) continue;
        lost.push({
            locale,
            file,
            id,
            kind,
            machine: isMachine(current),
            source: { time: 0, order: 0, sha: 'links' },
            target: { time: 0, order: 0, sha: 'links' },
            english: preview(pair.resolve(sourceText)),
            translation: preview(current),
        });
    }
    return lost;
}

/**
 * Drift a change *introduces*: en-US pairs it reworded whose translations it
 * left behind.
 *
 * This, not the absolute census, is what CI gates on. The census reports every
 * translation older than its source, and a slice of those can never clear —
 * when a reworded en-US string already had a correct translation, re-translating
 * writes the same bytes and leaves no trace, so value history keeps calling it
 * stale (see `drift.test.ts`). Gating on the absolute number would be a
 * permanently red build. Gating on what a change introduces is both achievable
 * and the thing actually worth preventing: no PR gets to reword English and
 * leave thirty languages describing the old wording.
 *
 * It also needs only the base commit rather than the whole history, so CI can
 * fetch one commit instead of cloning a 225MiB pack.
 */
export function driftSince(
    base: string,
    sourceFile: string,
    targetFile: string,
    locale: string,
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    cwd?: string,
): { locale: string; file: string; id: string; kind: LocaleStringKind }[] {
    const sourceBefore = valuesAt(base, sourceFile, cwd);
    const sourceAfter = valuesAt(WorkingTree, sourceFile, cwd);
    if (sourceBefore === undefined || sourceAfter === undefined) return [];
    const targetBefore = valuesAt(base, targetFile, cwd);
    const targetAfter = valuesAt(WorkingTree, targetFile, cwd);
    if (targetBefore === undefined || targetAfter === undefined) return [];

    const targetText = readJSON(
        cwd === undefined ? targetFile : `${cwd}/${targetFile}`,
    );

    const drifted = [];
    for (const [id, current] of sourceAfter) {
        const entry = kinds.get(id);
        if (entry === undefined) continue;
        const wasSource = sourceBefore.get(id);
        // A brand new key isn't drift — every locale gets it as `$?`.
        if (wasSource === undefined || wasSource === current) continue;
        // The translation moved too, so this change carried it along.
        if (targetAfter.get(id) !== targetBefore.get(id)) continue;
        // Already queued for the translator, so it isn't being left behind.
        const value =
            targetText === undefined
                ? undefined
                : entry.pair.resolve(targetText);
        if (value !== undefined && alreadyQueued(value)) continue;
        drifted.push({ locale, file: targetFile, id, kind: entry.kind });
    }
    return drifted;
}

/**
 * Translatable en-US pairs whose meaning changed between two git revisions.
 *
 * This is the cheap counterpart to the full census: two blob reads instead of a
 * history walk, which is all the pre-commit hook needs to say "you just changed
 * the meaning of these strings, the translations are now behind."
 */
export function changedBetween(
    from: string,
    to: string,
    file: string,
    kinds: Map<string, { kind: LocaleStringKind; pair: LocalePath }>,
    cwd?: string,
): { id: string; previous: string; current: string }[] {
    const before = valuesAt(from, file, cwd);
    const after = valuesAt(to, file, cwd);
    if (before === undefined || after === undefined) return [];
    const changes: { id: string; previous: string; current: string }[] = [];
    for (const [id, current] of after) {
        if (!kinds.has(id)) continue;
        const previous = before.get(id);
        // A brand new key is not drift — every locale gets it as `$?`.
        if (previous === undefined || previous === current) continue;
        changes.push({ id, previous, current });
    }
    return changes;
}

/** Summarize a locale's drift for the report table. */
export function summarize(entries: Stale[]) {
    return {
        total: entries.length,
        markable: entries.filter((entry) => isMarkable(entry, false)).length,
        machine: entries.filter(
            (entry) => entry.machine && isMarkable(entry, false),
        ).length,
        human: entries.filter(
            (entry) => !entry.machine && isMarkable(entry, false),
        ).length,
        names: entries.filter((entry) => entry.kind === 'name').length,
    };
}

/** Format a stale entry for the detail report. */
export function describe(entry: Stale, log: Log): void {
    const when = new Date(entry.source.time * 1000).toISOString().slice(0, 10);
    const detail = log.scope(`${entry.id} (${entry.kind})`);
    detail.say(
        `en-US changed ${when} in ${entry.source.sha.slice(0, 8)}${
            entry.source.previous === undefined
                ? ''
                : `, from ${entry.source.previous}`
        }`,
    );
    detail.say(`en-US now: ${entry.english}`);
    detail.say(
        `${entry.locale}${entry.machine ? ' ($~)' : ' (human)'}: ${entry.translation}`,
    );
}
