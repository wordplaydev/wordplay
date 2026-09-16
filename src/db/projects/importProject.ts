import type Project from '@db/projects/Project';
import { parseSerializedProject } from '../../examples/examples';

/**
 * Turns the text of a `.wp` file into a project a creator can open (#152).
 *
 * The single decider for what an import means, so the three ways in — the
 * picker on the projects page, a drop onto that page, and a drop onto an open
 * project — cannot disagree about it.
 *
 * ## What survives, and why so little
 *
 * Four things: the name, the sources, the locales the project declares, and
 * the preview glyph. Everything else on a serialized project is one of three
 * kinds of thing that has no meaning in a different account:
 *
 * - **Identity and sync**: `owner`, `collaborators`, `viewers`, `commenters`,
 *   `gallery`, `chat`, `stamps`, `crdt`, `persisted`, `id`.
 * - **Somebody else's judgment**: `flags` are a moderator's decision; `nonPII`
 *   is one person's declaration that some text does not identify anyone; and
 *   `researchConsent` is permission to use the work in research — **a consent
 *   that arrives in a file is a consent nobody gave**.
 * - **Derived**: `dependencies` is recomputed from the `↓` lines in the code.
 *
 * Two are worth naming because carrying them would reach outside this account.
 * `kit` names a published kit in the registry, so an imported project that kept
 * it would make the importer's next publish push a version of *someone else's*
 * kit. `remixOf` registers a credit link the original owner's share dialog
 * queries, so keeping it would grow their remix list from files passed around
 * offline. An import is a copy, not a remix.
 *
 * This is not a new opinion: `Project.copy` already passes exactly the same
 * four through and resets the other twenty-one. Routing through it is what
 * keeps the two from drifting.
 */

/** Why a file could not be imported. Each is something to say to a creator,
 *  not an error to throw: a bad file is an ordinary thing to pick by mistake. */
export type ImportProblem = 'empty' | 'too-large' | 'unreadable';

export type ImportResult =
    | { kind: 'imported'; project: Project }
    | { kind: 'failed'; problem: ImportProblem };

/**
 * How much text a project file may hold.
 *
 * Matched to Firestore's document limit, which is what a project has to fit
 * inside to be saved at all — so a file above it could be imported and then
 * never sync, which is a worse failure than refusing it here. Checked before
 * parsing, so a huge file costs nothing.
 */
export const MAX_IMPORT_BYTES = 1048576;

/** What this module needs of the projects database: the deserialization that
 *  supplies a locales database and resolves borrowed kits. Structural, so a
 *  test can hand it a stand-in without standing up Firebase. */
export type ProjectLoader = {
    deserialize(serialized: unknown): Promise<Project | undefined>;
};

/**
 * A project from the text of a file, owned by `owner` and belonging to nobody
 * else.
 *
 * `id` is a placeholder: the caller decides the real one, because a project
 * being added to a list and a project replacing an open one want different
 * things from it.
 */
export default async function importProject(
    text: string,
    owner: string | null,
    loader: ProjectLoader,
): Promise<ImportResult> {
    if (text.trim().length === 0) return { kind: 'failed', problem: 'empty' };

    if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
        return { kind: 'failed', problem: 'too-large' };

    let project: Project | undefined;
    try {
        // `parseSerializedProject` defaults every field it does not read from
        // the file to a fresh project's value, so the reset is the format's
        // rather than something this module has to remember to do.
        const serialized = parseSerializedProject(text, 'imported');
        project = await loader.deserialize(serialized);
    } catch {
        // A file that is not a project at all — a photo renamed, a truncated
        // download — lands here. There is nothing to tell a creator except
        // that it did not work.
        return { kind: 'failed', problem: 'unreadable' };
    }

    if (project === undefined) return { kind: 'failed', problem: 'unreadable' };

    // Through `copy` rather than by hand: it is already the decider for "a
    // fresh project from an existing one, with no record of where it came
    // from", and it mints a new id, takes the new owner, and clears the other
    // twenty-one fields. A second implementation here would drift from it.
    return { kind: 'imported', project: project.copy(owner) };
}
