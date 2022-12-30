import { test, expect } from 'vitest';
import { examples, makeProject, type Stuff } from './examples';

test.each(examples)(`Ensure $name has no conflicts`, (example: Stuff) => {
    const project = makeProject(example);
    project.analyze();
    const context = project.getContext(project.main);
    for (const conflict of Array.from(project.primaryConflicts.values()).flat())
        console.error(conflict.getExplanation(context, 'eng'));
    expect(project.primaryConflicts).toHaveLength(0);
});
