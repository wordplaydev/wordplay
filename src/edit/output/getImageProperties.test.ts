import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import OutputExpression from '@edit/output/OutputExpression';

/**
 * A new output type reaches the palette through two ladders in `OutputExpression`, and
 * neither fails loudly: one decides whether the evaluate is output at all, the other
 * which properties to offer. Missing from either, a picture simply has no palette, with
 * nothing to say why.
 */
function imageExpression() {
    const source = new Source('test', `Image([[🌈(50% 0 0°)]] "a picture")`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluate = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(project.shares.output.Image, project.getNodeContext(n)),
        );
    if (evaluate === undefined) throw new Error('no image found');
    return new OutputExpression(project, evaluate, DefaultLocales);
}

test('a picture is an output the palette knows', () => {
    expect(imageExpression().isOutput()).toBe(true);
});

test('a picture offers its own properties and the shared ones', () => {
    const properties = imageExpression().getEditableProperties();
    const has = (name: Parameters<(typeof properties)[number]['isName']>[1]) =>
        properties.some((property) => property.isName(DefaultLocales, name));
    // Its own: what it says it is, and how big it is.
    expect(has((l) => l.output.Image.description.names)).toBe(true);
    expect(has((l) => l.output.Image.width.names)).toBe(true);
    expect(has((l) => l.output.Image.height.names)).toBe(true);
    // And the ones every output has, taken from the shared list.
    expect(has((l) => l.output.Phrase.place.names)).toBe(true);
});
