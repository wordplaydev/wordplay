import PropertyReference from './PropertyReference';
import TextValue from '@values/TextValue';
import { test, expect } from 'vitest';
import Source from './Source';
import Project from '../models/Project';
import Bind from './Bind';
import evaluateCode from '../runtime/evaluate';
import DefaultLocale from '../locale/DefaultLocale';

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
            (n): n is PropertyReference => n instanceof PropertyReference
        )?.name;

    expect(prop).toBeDefined();

    const defs = prop?.getDefinitionsInScope(context);

    expect(prop?.getDefinitionOfNameInScope('sneaky', context)).toBeUndefined();
    expect(
        prop?.getDefinitionOfNameInScope('bystander', context)
    ).toBeUndefined();
    expect(
        defs?.find((n) => n instanceof Bind && n.hasName('sneaky'))
    ).toBeUndefined();
    expect(
        defs?.find((n) => n instanceof Bind && n.hasName('bystander'))
    ).toBeUndefined();
});

test('Test access evaluate', () => {
    expect(evaluateCode("•Cat(name•'') ()\nCat('boomy').name")).toBeInstanceOf(
        TextValue
    );
});
