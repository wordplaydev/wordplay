import { test, expect } from 'vitest';
import eng_serious from '../translations/eng_serious';
import { examples, makeProject, type Stuff } from './examples';

test.each(examples)(`Ensure $name has no conflicts`, (example: Stuff) => {
    const project = makeProject(example);
    project.analyze();
    const context = project.getContext(project.main);
    for (const conflict of Array.from(project.primaryConflicts.values()).flat())
        console.error(conflict.getPrimaryExplanation(eng_serious, context));
    expect(project.primaryConflicts).toHaveLength(0);
});
