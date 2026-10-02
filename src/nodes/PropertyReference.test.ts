import TextValue from '#values/TextValue.ts';
import { expect, test } from 'vitest';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import evaluateCode from '#runtime/evaluate.ts';
import Bind from '#nodes/Bind.ts';
import PropertyReference from '#nodes/PropertyReference.ts';
import Source from '#nodes/Source.ts';

test('Test scoping', () => {
    const code = `
            bystander: 1
            •Cat(name•"")
            sneaky: 1
            boomy: Cat("boomy")
            boomy.name
        `;

    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);

    const prop = source
        .nodes()
        .find(
            (n): n is PropertyReference => n instanceof PropertyReference,
        )?.name;

    expect(prop).toBeDefined();

    const defs = prop?.getDefinitionsInScope(context);

    expect(prop?.getDefinitionOfNameInScope('sneaky', context)).toBeUndefined();
    expect(
        prop?.getDefinitionOfNameInScope('bystander', context),
    ).toBeUndefined();
    expect(
        defs?.find((n) => n instanceof Bind && n.hasName('sneaky')),
    ).toBeUndefined();
    expect(
        defs?.find((n) => n instanceof Bind && n.hasName('bystander')),
    ).toBeUndefined();
});

test('Test access evaluate', () => {
    expect(evaluateCode("•Cat(name•'') ()\nCat('boomy').name")).toBeInstanceOf(
        TextValue,
    );
});

test('Definition.staticName resolves the static bind', () => {
    // Regression: the inner `a` Reference of `Math.a` walks its scope chain
    // from the subject's type — a StructureDefinitionType. That type must
    // expose the structure's static members via `getDefinitions`, or `a`
    // is flagged as UnknownName even though `Math.a` is the intended path.
    const code = '•Math() (\n\t↑ a: 1\n)\nMath.a';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);

    const prop = source
        .nodes()
        .find(
            (n): n is PropertyReference =>
                n instanceof PropertyReference && n.name?.getName() === 'a',
        );
    expect(prop).toBeDefined();
    if (!prop?.name) return;

    const def = prop.name.getDefinitionOfNameInScope('a', context);
    expect(def).toBeInstanceOf(Bind);
    expect(def instanceof Bind && def.hasName('a')).toBe(true);

    // And there should be no conflict on the inner Reference.
    project.analyze();
    expect(Array.from(project.analyze().conflictedNodes.keys())).toEqual([]);
});
