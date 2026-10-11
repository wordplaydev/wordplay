import { Projects } from '#db/projects/Projects.ts';
import Project from '#db/projects/Project.ts';
import { PersistenceType } from '#db/projects/ProjectHistory.svelte.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';

function example(code: string) {
    return Project.make(
        null,
        'example',
        new Source('example', code),
        [],
        DefaultLocale,
    );
}

test('an ephemeral example is editable and undoable but never listed', async () => {
    const project = example('1 + 1');
    const history = Projects.trackEphemeral(project);
    expect(history?.getPersisted()).toBe(PersistenceType.None);
    expect(Projects.isEphemeral(project.getID())).toBe(true);

    const revised = project.withSource(
        project.getMain(),
        new Source('example', '1 + 2'),
    );
    await Projects.reviseProject(revised);
    expect(
        Projects.getHistory(project.getID())
            ?.getCurrent()
            .getMain()
            .getCode()
            .toString(),
    ).toBe('1 + 2');

    // Someone tinkering with an example hasn't made a project of their own.
    expect(
        Projects.allEditableProjects.some((p) => p.getID() === project.getID()),
    ).toBe(false);

    const undone = await Projects.undoRedo(project.getID(), -1);
    expect(undone?.getMain().getCode().toString()).toBe('1 + 1');

    Projects.forget(project.getID());
    expect(Projects.getHistory(project.getID())).toBeUndefined();
    expect(Projects.isEphemeral(project.getID())).toBe(false);
});
