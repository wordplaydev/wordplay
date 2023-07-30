import { test, expect } from 'vitest';
import { examples, makeProject, type Stuff } from './examples';
import { getDefaultBasis } from '../basis/Basis';

const basis = getDefaultBasis();
const locale = basis.locales[0];

test.each(examples)(`Ensure $name has no conflicts`, async (example: Stuff) => {
    const project = await makeProject(example);
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
