import { Locales } from '#db/Database.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import Project from '#db/projects/Project.ts';
import {
    PersistenceType,
    ProjectHistory,
} from '#db/projects/ProjectHistory.svelte.ts';
import { Projects } from '#db/projects/Projects.ts';

/**
 * How the projects database applies {@link reconcileSources} when another copy
 * of a tracked project arrives. The table test covers the rule; these cover
 * that `track` hands it the right facts and does what it says, with the real
 * database and real projects. Each was a way to lose code.
 */

let next = 0;
/** A project the cloud holds, saved at the current (fake) time. */
function cloudProject(code: string): Project {
    return Project.make(
        `reconcile-${next++}`,
        'name',
        new Source('main', code),
        [],
        DefaultLocale,
    )
        .asPersisted()
        .withNewTime();
}

/** The same project with different code, as of `minutes` later. */
function laterVersion(project: Project, code: string, minutes: number) {
    vi.setSystemTime(Date.now() + minutes * 60_000);
    const main = project.getMain();
    return project.withSource(main, main.withCode(code)).withNewTime();
}

function codeOf(id: string) {
    return Projects.getHistory(id)?.getCurrent().getMain().code.toString();
}

/** A row read from this device at page load whose save was never confirmed. */
const UnconfirmedRow = { initial: true, dirty: true };

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T12:00:00Z'));
});
afterEach(() => {
    // Drop the save timers these tests arm; nothing here has a cloud to reach.
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe('a copy arriving for a tracked project', () => {
    test('an unconfirmed edit read after the cloud’s copy is kept and sent', () => {
        // The reload race: the cloud snapshot was tracked before this device's
        // storage had been read.
        const cloud = cloudProject('1');
        const edited = laterVersion(cloud, '1 + 1', 1);
        Projects.track(cloud, true, PersistenceType.Online, true);
        Projects.track(
            edited,
            true,
            PersistenceType.Online,
            false,
            false,
            UnconfirmedRow,
        );

        expect(codeOf(cloud.getID())).toBe('1 + 1');
        expect(Projects.getHistory(cloud.getID())?.isUnsaved()).toBe(true);
    });

    test('an unconfirmed edit is not replaced by a later cloud copy, which is kept as a checkpoint', () => {
        // Another device opened the project, which is enough to give its copy
        // a later timestamp than the edit made here offline.
        const base = cloudProject('1');
        const edited = laterVersion(base, '1 + 1', 1);
        const elsewhere = laterVersion(base, '2', 5);
        Projects.track(
            edited,
            true,
            PersistenceType.Online,
            false,
            false,
            UnconfirmedRow,
        );
        Projects.track(elsewhere, true, PersistenceType.Online, true);

        const history = Projects.getHistory(base.getID());
        expect(codeOf(base.getID())).toBe('1 + 1');
        expect(history?.isUnsaved()).toBe(true);
        // What it sends has to read as later than the copy it kept out.
        expect(history?.getCurrent().getTimestamp()).toBeGreaterThan(
            elsewhere.getTimestamp(),
        );
        expect(
            history
                ?.getCurrent()
                .getCheckpoints()
                .some((checkpoint) => checkpoint.sources[0]?.code === '2'),
        ).toBe(true);
    });

    test('code typed here is not replaced by a later cloud copy', async () => {
        const base = cloudProject('1');
        Projects.track(base, true, PersistenceType.Online, true);
        const typed = laterVersion(base, '1 + 1', 1);
        await Projects.edit(typed, true, false);
        Projects.track(
            laterVersion(base, '2', 5),
            true,
            PersistenceType.Online,
            true,
        );

        expect(codeOf(base.getID())).toBe('1 + 1');
    });

    test('a saved copy takes a later cloud copy and owes the cloud nothing', () => {
        // It used to be marked unsaved, so every device that could edit a
        // project rewrote the whole document after anyone else saved it.
        const base = cloudProject('1');
        Projects.track(base, true, PersistenceType.Online, true);
        Projects.track(
            laterVersion(base, '2', 5),
            true,
            PersistenceType.Online,
            true,
        );

        expect(codeOf(base.getID())).toBe('2');
        expect(Projects.getHistory(base.getID())?.isUnsaved()).toBe(false);
    });

    test('a saved copy takes the later version another tab wrote to this device', () => {
        // It used to keep its own code under the other tab's timestamp, and
        // then save that.
        const base = cloudProject('1');
        Projects.track(base, true, PersistenceType.Online, true);
        Projects.track(
            laterVersion(base, '2', 5),
            true,
            PersistenceType.Online,
            false,
            false,
            { initial: false, dirty: true },
        );

        expect(codeOf(base.getID())).toBe('2');
        expect(Projects.getHistory(base.getID())?.isUnsaved()).toBe(false);
    });

    test('an older cloud copy changes nothing', () => {
        const base = cloudProject('1');
        const newer = laterVersion(base, '2', 5);
        Projects.track(newer, true, PersistenceType.Online, true);
        Projects.track(base, true, PersistenceType.Online, true);

        expect(codeOf(base.getID())).toBe('2');
    });
});

describe('undo', () => {
    test('an undo that an edit overtakes leaves the edit in place', async () => {
        // Undo reads the earlier version asynchronously. It used to step back
        // first, so an edit made meanwhile was buried under the undone version.
        vi.useRealTimers();
        const first = cloudProject('1');
        const main = first.getMain();
        const second = first.withSource(main, main.withCode('2'));
        const typed = first.withSource(main, main.withCode('3'));
        const history = new ProjectHistory(
            first,
            PersistenceType.None,
            true,
            Locales,
        );
        history.edit(second, true);

        const undo = history.undoRedo(-1);
        history.edit(typed, true);

        expect(await undo).toBeUndefined();
        expect(history.getCurrent().getMain().code.toString()).toBe('3');
    });
});

describe('starting', () => {
    test('start() returns once this device’s projects have been read', async () => {
        // It never did: the promise it waits on could not resolve, so nothing
        // that waited for projects — the save on tab close among them — ran.
        vi.useRealTimers();
        const outcome = await Promise.race([
            Projects.start().then(() => 'started'),
            new Promise((resolve) => setTimeout(() => resolve('hung'), 2000)),
        ]);
        expect(outcome).toBe('started');
    });
});
