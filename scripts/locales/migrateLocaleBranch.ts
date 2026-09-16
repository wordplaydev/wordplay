/**
 * Move a contributor's branch onto the section-file layout, so that splitting
 * the locale documents costs them nothing.
 *
 * A branch that edits `static/locales/<code>/<code>.json` cannot be rebased
 * across the split: git sees the file deleted and every hunk conflicts, and for
 * a 32-commit review branch that is not something anyone should be asked to
 * redo by hand. So the diff is replayed *semantically* — by locale path rather
 * than by line — onto whatever shape the files are in now.
 *
 * Values are read through `getKeyTemplatePairs`, which carries each path's raw
 * value. That matters: `drift.ts`'s `collectValues` looks like the obvious tool
 * here and is the wrong one, because it canonicalizes — it strips glossary
 * references so that adding an `@` does not queue paid re-translation — and
 * replaying canonicalized values would quietly delete every glossary link a
 * contributor had added.
 */
import { execFileSync } from 'child_process';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';

export type Delta = {
    /** Dotted locale path → the value the branch wants there. */
    set: Map<string, string | string[]>;
    /** Dotted locale paths the branch removed. */
    remove: string[];
};

export function git(...args: string[]): string {
    return execFileSync('git', args, {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 512,
    });
}

/**
 * The contributor's own commits, oldest first.
 *
 * First-parent and non-merge, which is not a nicety: #1319 is 32 commits of
 * which 21 are merges of `main` into the branch. Replaying every commit in
 * `base..tip` replays *main's* history as though the contributor had written
 * it, which silently reintroduced an `output.sequence` that main had added and
 * later removed — a key neither the base nor the branch tip has. A merge brings
 * in changes the post-split `main` already has, so it is skipped; what is left
 * is the work the branch is actually for.
 */
export function branchCommits(base: string, branch: string): string[] {
    return git(
        'rev-list',
        '--reverse',
        '--first-parent',
        '--no-merges',
        `${base}..${branch}`,
    )
        .trim()
        .split('\n')
        .filter((sha) => sha.length > 0);
}

/** A file's contents at a commit, or undefined when it did not exist there. */
export function readAt(sha: string, file: string): object | undefined {
    try {
        const parsed: unknown = JSON.parse(git('show', `${sha}:${file}`));
        return typeof parsed === 'object' &&
            parsed !== null &&
            !Array.isArray(parsed)
            ? parsed
            : undefined;
    } catch {
        return undefined;
    }
}

/** Every leaf in a locale, by dotted path, with its value unmodified. */
export function valuesByPath(locale: object): Map<string, string | string[]> {
    const values = new Map<string, string | string[]>();
    for (const pair of getKeyTemplatePairs(locale))
        values.set(pair.toString(), pair.value);
    return values;
}

function sameValue(
    a: string | string[] | undefined,
    b: string | string[] | undefined,
): boolean {
    if (a === undefined || b === undefined) return a === b;
    if (Array.isArray(a) || Array.isArray(b))
        return (
            Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((item, index) => item === b[index])
        );
    return a === b;
}

/**
 * Every path in a locale, containers included, in `LocalePath`'s spelling — a
 * top-level key carries a leading dot, deeper ones do not.
 *
 * Containers and not just leaves, because a branch can remove a whole subtree,
 * and deleting only its leaves would leave the empty husk behind. That is not
 * hypothetical: replaying #1319 leaf-by-leaf left an `output.sequence: {}` that
 * neither the base nor the tip has.
 */
export function structurePaths(locale: object, prefix = ''): Set<string> {
    const paths = new Set<string>();
    for (const key of Object.keys(locale)) {
        const id = prefix === '' ? `.${key}` : `${prefix}.${key}`;
        const childPrefix = prefix === '' ? `${key}` : id;
        paths.add(id);
        const value: unknown = Reflect.get(locale, key);
        if (typeof value === 'object' && value !== null)
            for (const nested of structurePaths(value, childPrefix))
                paths.add(nested);
    }
    return paths;
}

/** What one commit did to one locale, as locale paths rather than lines. */
export function deltaBetween(before: object | undefined, after: object): Delta {
    const from =
        before === undefined
            ? new Map<string, string | string[]>()
            : valuesByPath(before);
    const to = valuesByPath(after);

    const set = new Map<string, string | string[]>();
    for (const [path, value] of to)
        if (!sameValue(from.get(path), value)) set.set(path, value);

    // Compared over the whole structure, so a removed subtree is one removal
    // rather than a scatter of leaves. Only the shallowest are kept: deleting a
    // parent takes its children with it, and deleting a child first would leave
    // a parent that looks legitimately empty.
    const beforePaths =
        before === undefined ? new Set<string>() : structurePaths(before);
    const afterPaths = structurePaths(after);
    const gone = [...beforePaths].filter((path) => !afterPaths.has(path));
    const remove = gone.filter(
        (path) =>
            !gone.some(
                (other) =>
                    other !== path &&
                    (path.startsWith(`${other}.`) ||
                        path.startsWith(`.${other}.`)),
            ),
    );

    return { set, remove };
}

function segmentsOf(dotted: string): (string | number)[] {
    return dotted
        .split('.')
        .filter((segment) => segment.length > 0)
        .map((segment) => {
            const index = parseInt(segment);
            return isNaN(index) ? segment : index;
        });
}

/**
 * Set a value at a locale path, building containers on the way down.
 *
 * `LocalePath.repair` cannot be used: it sets a value only where the path
 * already exists, so every key a contributor *added* — a new glossary form, or
 * the whole of a locale nobody had written yet — would be dropped in silence.
 */
export function setAt(
    root: object,
    dotted: string,
    value: string | string[],
): void {
    const segments = segmentsOf(dotted);
    let container: object = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (segment === undefined) return;
        let next: unknown = Reflect.get(container, segment);
        if (typeof next !== 'object' || next === null) {
            // A numeric next segment means the thing being built is a list.
            next = typeof segments[index + 1] === 'number' ? [] : {};
            Reflect.set(container, segment, next);
        }
        if (typeof next !== 'object' || next === null) return;
        container = next;
    }
    const last = segments[segments.length - 1];
    if (last !== undefined) Reflect.set(container, last, value);
}

export function deleteAt(root: object, dotted: string): void {
    const segments = segmentsOf(dotted);
    let container: unknown = root;
    for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (segment === undefined) return;
        if (typeof container !== 'object' || container === null) return;
        container = Reflect.get(container, segment);
    }
    const last = segments[segments.length - 1];
    if (last === undefined) return;
    if (typeof container === 'object' && container !== null)
        Reflect.deleteProperty(container, last);
}

export function applyDelta(locale: object, delta: Delta): object {
    const revised: object = structuredClone(locale);
    for (const path of delta.remove) deleteAt(revised, path);
    for (const [path, value] of delta.set) setAt(revised, path, value);
    return revised;
}
