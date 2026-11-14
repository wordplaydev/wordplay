import { DB } from '#db/Database.ts';
import { PersistenceType } from '#db/projects/ProjectHistory.svelte.ts';
import Project from '#db/projects/Project.ts';
import { Projects } from '#db/projects/Projects.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { expect, test } from 'vitest';

test('what a program saves with Source is written into the code as it is now, not as it was when the program started', async () => {
    // An evaluator keeps running while its creator types. It used to revise
    // the project it started from, which put the code back to what it was.
    const main = new Source('main', `Source('notes' 5)`);
    const project = Project.make('data-write', 'test', main, [], DefaultLocale);
    Projects.track(project, true, PersistenceType.None, true);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);

    // The creator types before the program finishes.
    const typed = `Source('notes' 5)\n'typed since'`;
    await Projects.reviseProject(
        project.withSource(main, main.withCode(typed)),
    );

    const value = evaluator.getInitialValue();
    expect(value).toBeDefined();
    if (value === undefined) return;
    await evaluator.editSource(value);

    const latest = Projects.getHistory('data-write')?.getCurrent();
    expect(latest?.getMain().code.toString()).toBe(typed);
    expect(latest?.getSourceWithName('notes')?.code.toString()).toBe('5');
});
