import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import StructureDefinition from '@nodes/StructureDefinition';
import type StreamDefinition from '@nodes/StreamDefinition';
import OutputExpression from '@edit/output/OutputExpression';
import type OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
import type { LocaleTextsAccessor } from '@locale/Locales';
import getMatterProperties from '@edit/output/getMatterProperties';
import getFormProperties from '@edit/output/getFormProperties';
import getPlacementProperties from '@edit/output/getPlacementProperties';
import getArrangementProperties from '@edit/output/getArrangementProperties';
import getPlaceProperties from '@edit/output/getPlaceProperties';
import getVelocityProperties from '@edit/output/getVelocityProperties';
import getAuraProperties from '@edit/output/getAuraProperties';
import getStructureProperties from '@edit/output/getStructureProperties';
import getPhraseProperties from '@edit/output/PhraseProperties';

/** Parse code and find the first Evaluate of the given definition. */
function find(
    code: string,
    getDef: (project: Project) => StructureDefinition | StreamDefinition,
) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const def = getDef(project);
    const evaluate = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate && n.is(def, project.getNodeContext(n)),
        );
    if (evaluate === undefined) throw new Error('no matching evaluate');
    return { project, evaluate };
}

/** Build the value set for one property of a nested Evaluate. */
function valuesFor(
    project: Project,
    evaluate: Evaluate,
    properties: OutputProperty[],
    name: LocaleTextsAccessor,
) {
    const property = properties.find((p) => p.isName(DefaultLocales, name));
    if (property === undefined) throw new Error('no matching property');
    return new OutputPropertyValueSet(
        property,
        [new OutputExpression(project, evaluate, DefaultLocales)],
        DefaultLocales,
    );
}

test('Matter inputs are editable and read back', () => {
    const { project, evaluate } = find(
        `Phrase("hi" matter: Matter(2kg 0.5 0.8 0.1))`,
        (p) => p.shares.output.Matter,
    );
    const mass = valuesFor(
        project,
        evaluate,
        getMatterProperties(project, DefaultLocales),
        (l) => l.output.Matter.mass.names,
    );
    expect(mass.areEditable(project)).toBe(true);
    expect(mass.getNumber()).toBe(2);

    // Editing mass replaces the Matter Evaluate (a direct, non-transitive edit).
    const replacements = mass.getEditReplacements(
        project,
        NumberLiteral.make(5, Unit.reuse(['kg'])),
    );
    expect(replacements[0][0]).toBe(evaluate);

    const bounciness = valuesFor(
        project,
        evaluate,
        getMatterProperties(project, DefaultLocales),
        (l) => l.output.Matter.bounciness.names,
    );
    expect(bounciness.getNumber()).toBe(0.5);
});

test('the Matter property is exposed on a Phrase', () => {
    const { project, evaluate } = find(
        `Phrase("hi" matter: Matter(2kg 0.5 0.8 0.1))`,
        (p) => p.shares.output.Phrase,
    );
    const matter = valuesFor(
        project,
        evaluate,
        getPhraseProperties(project, DefaultLocales),
        (l) => l.output.Phrase.matter.names,
    );
    expect(matter.areEditable(project)).toBe(true);
});

test('Rectangle form inputs are editable and read back', () => {
    const { project, evaluate } = find(
        `Shape(Rectangle(-1m 1m 1m -1m))`,
        (p) => p.shares.output.Rectangle,
    );
    const left = valuesFor(
        project,
        evaluate,
        getFormProperties(project, DefaultLocales, evaluate),
        (l) => l.output.Rectangle.left.names,
    );
    expect(left.areEditable(project)).toBe(true);
    expect(left.getNumber()).toBe(-1);
});

test('Placement inputs (distance, axes) are editable', () => {
    const { project, evaluate } = find(
        `Phrase("hi" place: Placement(Place() 2m ⊤ ⊥ ⊥))`,
        (p) => p.shares.input.Placement,
    );
    const distance = valuesFor(
        project,
        evaluate,
        getPlacementProperties(project, DefaultLocales),
        (l) => l.input.Placement.inputs[1].names,
    );
    expect(distance.areEditable(project)).toBe(true);
    expect(distance.getNumber()).toBe(2);

    const horizontal = valuesFor(
        project,
        evaluate,
        getPlacementProperties(project, DefaultLocales),
        (l) => l.input.Placement.inputs[2].names,
    );
    expect(horizontal.areEditable(project)).toBe(true);
    expect(horizontal.getBool()).toBe(true);
});

test('Place coordinates are editable, and an unset ø rotation is still editable (inline)', () => {
    const { project, evaluate } = find(
        `Phrase("hi" place: Place(1m 2m 3m))`,
        (p) => p.shares.output.Place,
    );
    const x = valuesFor(
        project,
        evaluate,
        getPlaceProperties(project, DefaultLocales),
        (l) => l.output.Place.x.names,
    );
    expect(x.areEditable(project)).toBe(true);
    expect(x.getNumber()).toBe(1);

    // rotation is unset (defaults to ø) but inline + ø-accepting, so still editable at 0.
    const rotation = valuesFor(
        project,
        evaluate,
        getPlaceProperties(project, DefaultLocales),
        (l) => l.output.Place.rotation.names,
    );
    expect(rotation.areSet()).toBe(false);
    expect(rotation.areEditable(project)).toBe(true);
});

test('Velocity components use compound units and an unset ø component is not editable', () => {
    const { project, evaluate } = find(
        `Phrase("hi" place: Motion(Place() Velocity(1m/s 2m/s)))`,
        (p) => p.shares.output.Velocity,
    );
    const x = valuesFor(
        project,
        evaluate,
        getVelocityProperties(project, DefaultLocales),
        (l) => l.output.Velocity.x.names,
    );
    expect(x.areEditable(project)).toBe(true);
    expect(x.getNumber()).toBe(1);

    // Editing x writes a m/s compound-unit literal to the Velocity Evaluate.
    const replacements = x.getEditReplacements(
        project,
        NumberLiteral.make(5, Unit.create(['m'], ['s'])),
    );
    expect(replacements[0][0]).toBe(evaluate);

    // angle is unset (ø); ø is not editable for Velocity, so it shows as computed.
    const angle = valuesFor(
        project,
        evaluate,
        getVelocityProperties(project, DefaultLocales),
        (l) => l.output.Velocity.angle.names,
    );
    expect(angle.areEditable(project)).toBe(false);
});

test('Aura color is editable even when unset (ø), and blur reads its default', () => {
    const { project, evaluate } = find(
        `Phrase("hi" aura: Aura())`,
        (p) => p.shares.output.Aura,
    );
    // Color is unset (defaults to ø) but inline + ø-accepting, so still editable.
    const color = valuesFor(
        project,
        evaluate,
        getAuraProperties(project, DefaultLocales),
        (l) => l.output.Aura.color.names,
    );
    expect(color.areSet()).toBe(false);
    expect(color.areEditable(project)).toBe(true);

    // Blur is unset too, but inline reads its 0.1m default and stays editable.
    const blur = valuesFor(
        project,
        evaluate,
        getAuraProperties(project, DefaultLocales),
        (l) => l.output.Aura.blur.names,
    );
    expect(blur.areSet()).toBe(false);
    expect(blur.areEditable(project)).toBe(true);
    expect(blur.getNumber()).toBe(0.1);
});

test('an unregistered structure is supported automatically by reflecting its inputs', () => {
    const source = new Source(
        'test',
        `•Foo(n•#m: 0m b•? : ⊥ t•"": "")\nFoo(5m ⊤ "hi")`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluate = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.getFunction(project.getNodeContext(n)) instanceof
                    StructureDefinition,
        );
    if (evaluate === undefined) throw new Error('no Foo evaluate');

    // The registry has no entry for Foo, so it reflects a property per input.
    const properties = getStructureProperties(
        project,
        DefaultLocales,
        evaluate,
    );
    expect(properties.length).toBe(3);

    const outputs = [new OutputExpression(project, evaluate, DefaultLocales)];
    const number = new OutputPropertyValueSet(
        properties[0],
        outputs,
        DefaultLocales,
    );
    expect(number.areEditable(project)).toBe(true);
    expect(number.getNumber()).toBe(5);

    const bool = new OutputPropertyValueSet(
        properties[1],
        outputs,
        DefaultLocales,
    );
    expect(bool.areEditable(project)).toBe(true);
    expect(bool.getBool()).toBe(true);

    const text = new OutputPropertyValueSet(
        properties[2],
        outputs,
        DefaultLocales,
    );
    expect(text.areEditable(project)).toBe(true);
    expect(text.getText()).toBe('hi');
});

test('Grid arrangement inputs are editable and read back', () => {
    const { project, evaluate } = find(
        `Group(Grid(2 3) [])`,
        (p) => p.shares.output.Grid,
    );
    const rows = valuesFor(
        project,
        evaluate,
        getArrangementProperties(project, DefaultLocales, evaluate),
        (l) => l.output.Grid.rows.names,
    );
    expect(rows.areEditable(project)).toBe(true);
    expect(rows.getNumber()).toBe(2);
});
