import { test, expect } from 'vitest';
import { examples, makeProject, type Stuff } from './examples';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();
const locale = native.locales[0];

test.each(examples)(`Ensure $name has no conflicts`, (example: Stuff) => {
    const project = makeProject(example, native);
    project.analyze();
    project.getAnalysis();
    const context = project.getContext(project.main);
    for (const conflict of Array.from(
        project.getPrimaryConflicts().values()
    ).flat()) {
        const conflictingNodes = conflict.getConflictingNodes();
        console.error(conflictingNodes.primary.explanation(locale, context));
    }
    expect(project.getPrimaryConflicts()).toHaveLength(0);
});
