import { moderatedFlags } from '@db/projects/Moderation';
import Project from '@db/projects/Project';
import { PersistenceType } from '@db/projects/ProjectHistory.svelte';
import type ProjectsDatabase from '@db/projects/ProjectsDatabase.svelte';
import { ScratchPrefix } from '@db/projects/ScratchPrefix';
import type LocaleText from '@locale/LocaleText';
import Source from '@nodes/Source';

/**
 * A scratch project is a copy of a guide example that someone can edit (#1044).
 *
 * It follows the tutorial's model exactly: `listed: false` keeps it out of the
 * project list (ProjectPreviewSet filters on it), and PersistenceType.Local
 * keeps it out of the cloud. So it survives reloads on the device it was made
 * on, and never turns into a project the creator has to tidy up.
 */

/**
 * A stable ID for the scratch copy of some code.
 *
 * Deterministic on purpose. Pressing the button twice on the same example
 * should land back in the same project — with whatever edits were made last
 * time — rather than leaving a trail of near-identical copies in IndexedDB.
 * And because the ID is derived from the code, an example that changes
 * upstream yields a fresh scratch rather than silently reopening a copy of the
 * old lesson.
 *
 * FNV-1a over code points, rendered base 36. Not a cryptographic hash and
 * doesn't need to be: a collision would mean two different examples sharing a
 * scratch project, which is a curiosity rather than a hazard.
 */
export function scratchIDFor(code: string): string {
    let hash = 0x811c9dc5;
    for (const character of code) {
        hash ^= character.codePointAt(0) ?? 0;
        // The FNV prime, as shifts, so this stays in 32-bit integer math.
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `${ScratchPrefix}${hash.toString(36)}`;
}

/**
 * The scratch project for this code, making and tracking it if it's new.
 *
 * Synchronous on purpose: it has to run inside the click handler that opens
 * the window, because a popup blocker rejects a window opened after an await.
 */
export function ensureScratch(
    projects: ProjectsDatabase,
    code: string,
    locales: LocaleText[],
    owner: string | null,
): string {
    const id = scratchIDFor(code);

    // Already made, and possibly already edited — reuse it rather than
    // overwriting whatever tinkering happened last time.
    if (projects.getHistory(id) !== undefined) return id;

    // No name: a scratch project is a copy of an example to poke at, and
    // naming it is beside the point. The project view says what it is instead.
    const project = Project.make(
        id,
        '',
        new Source('', code),
        [],
        locales,
        owner,
        [],
        false,
        undefined,
        // Not listed: a scratch project is incidental to reading the guide, not
        // work the creator went looking for.
        false,
        false,
        false,
        null,
        // Nothing here is public, so there's nothing to moderate.
        moderatedFlags(),
    );

    projects.track(project, true, PersistenceType.Local, false);

    // Write it to the device now rather than on the usual one-second debounce.
    // The window that opens next is a different document with its own
    // in-memory database, and the only thing they share is IndexedDB — so if
    // the save is still pending when it boots, it finds nothing and shows
    // "unknown project". Not awaited, because the caller must reach
    // `window.open` inside the click that started it or a popup blocker
    // rejects the window; starting the transaction here is enough to order it
    // ahead of the new window's read.
    void projects.persist();

    return id;
}
