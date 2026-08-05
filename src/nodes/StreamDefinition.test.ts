import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import StreamDefinition from '@nodes/StreamDefinition';
import { expect, test } from 'vitest';

test('cloning a stream definition with a replacement does not throw', () => {
    // The grammar deliberately omits the basis-internal `expression`, so clone must
    // not route it through replaceChild — Node.replaceChild throws unconditionally
    // for a field the grammar doesn't declare, unlike an invalid replacement, which
    // only reports in the browser.
    const project = Project.make(
        null,
        'test',
        new Source('test', '1'),
        [],
        DefaultLocale,
    );
    const definition = project.shares.all.find(
        (share) => share instanceof StreamDefinition,
    );
    expect(definition).toBeDefined();
    if (definition === undefined) return;
    const clone = definition.clone({
        original: definition.names,
        replacement: definition.names.clone(),
        report: 'exception',
    });
    expect(clone).toBeInstanceOf(StreamDefinition);
    expect(clone.expression).toBe(definition.expression);
});
