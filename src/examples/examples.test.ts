import { test, expect } from 'vitest';
import { examples, makeProject, type Stuff } from './examples';
import en from '../locale/en-US.json';
import type Locale from '../locale/Locale';

test.each(examples)(`Ensure $name has no conflicts`, async (example: Stuff) => {
    const project = await makeProject(example);
    project.analyze();
    project.getAnalysis();
    const context = project.getContext(project.main);
    for (const conflict of Array.from(
        project.getPrimaryConflicts().values()
    ).flat()) {
        const conflictingNodes = conflict.getConflictingNodes();
        console.error(
            conflictingNodes.primary.explanation(en as Locale, context)
        );
    }
    expect(project.getPrimaryConflicts()).toHaveLength(0);
});
