import type Project from '../../db/projects/Project';
import type Locales from '../../locale/Locales';
import Evaluate from '../../nodes/Evaluate';
import type Expression from '../../nodes/Expression';
import ListLiteral from '../../nodes/ListLiteral';
import Reference from '../../nodes/Reference';
import { getTypeOutputProperties } from './OutputProperties';
import OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';

export default function getGroupProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Group.layout.names,
            new OutputPropertyOptions(
                Object.values(project.shares.output)
                    .filter((type) =>
                        type.implements(
                            project.shares.output.Arrangement,
                            project.getContext(project.getMain()),
                        ),
                    )
                    .map((type) => `${type.names.getNames()[0]}`)
                    .map((name) => ({ value: name, label: name })),
                false,
                (text: string) => Evaluate.make(Reference.make(text), []),
                (expression: Expression | undefined) =>
                    expression instanceof Evaluate
                        ? expression.fun.toWordplay()
                        : undefined,
            ),
            true,
            false,
            () => true,
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Stack.names),
                        project.shares.output.Stack,
                    ),
                    [],
                ),
        ),
        new OutputProperty(
            (l) => l.output.Group.content.names,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([]),
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
