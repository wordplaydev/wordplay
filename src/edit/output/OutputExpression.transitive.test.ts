import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import Bind from '@nodes/Bind';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import OutputExpression from '@edit/output/OutputExpression';
import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';

/** Build a value set for the Phrase's `size` property from the given source. */
function sizeValues(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const phrase = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(project.shares.output.Phrase, project.getNodeContext(n)),
        );
    if (phrase === undefined) throw new Error('no phrase found');
    const output = new OutputExpression(project, phrase, DefaultLocales);
    const property = output
        .getEditableProperties()
        .find((p) =>
            p.isName(DefaultLocales, (l) => l.output.Phrase.size.names),
        );
    if (property === undefined) throw new Error('no size property found');
    return {
        project,
        source,
        values: new OutputPropertyValueSet(property, [output], DefaultLocales),
    };
}

test('a property referencing a literal bind is editable and edits the upstream literal', () => {
    const { project, source, values } = sizeValues(
        `size: 5m\nPhrase('hi' size: size)`,
    );
    expect(values.areEditable(project)).toBe(true);
    expect(values.getNumber()).toBe(5);

    // The upstream literal is the `size` bind's value; an edit should target it.
    const sizeBind = source.expression
        .nodes()
        .find((n): n is Bind => n instanceof Bind && n.hasName('size'));
    const replacements = values.getEditReplacements(
        project,
        NumberLiteral.make(7, Unit.reuse(['m'])),
    );
    expect(replacements.length).toBe(1);
    expect(replacements[0][0]).toBe(sizeBind?.value);
});

test('a two-hop reference chain resolves to the literal', () => {
    const { project, values } = sizeValues(`a: 5m\nb: a\nPhrase('hi' size: b)`);
    expect(values.areEditable(project)).toBe(true);
    expect(values.getNumber()).toBe(5);
});

test('a computed expression stays read-only', () => {
    const { project, values } = sizeValues(`Phrase('hi' size: 1m + 1m)`);
    expect(values.areEditable(project)).toBe(false);
});

test('a direct literal is still editable via the output Evaluate', () => {
    const { project, values } = sizeValues(`Phrase('hi' size: 5m)`);
    expect(values.areEditable(project)).toBe(true);
    expect(values.getNumber()).toBe(5);
    // No reference chain → edit replaces the output Evaluate (not an upstream leaf).
    const replacements = values.getEditReplacements(
        project,
        NumberLiteral.make(7, Unit.reuse(['m'])),
    );
    expect(replacements[0][0]).toBeInstanceOf(Evaluate);
});
