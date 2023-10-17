import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import type Expression from '../nodes/Expression';
import ListLiteral from '../nodes/ListLiteral';
import Reference from '../nodes/Reference';
import OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';
import { getTypeOutputProperties } from './OutputProperties';
import type Locales from '../locale/Locales';

export default function getGroupProperties(
    project: Project,
    locales: Locales
): OutputProperty[] {
    return [
        new OutputProperty(
            locales.get((l) => l.output.Group.layout),
            new OutputPropertyOptions(
                Object.values(project.shares.output)
                    .filter((type) =>
                        type.implements(
                            project.shares.output.Arrangement,
                            project.getContext(project.getMain())
                        )
                    )
                    .map((type) => `${type.names.getNames()[0]}`),
                false,
                (text: string) => Evaluate.make(Reference.make(text), []),
                (expression: Expression | undefined) =>
                    expression instanceof Evaluate
                        ? expression.fun.toWordplay()
                        : undefined
            ),
            true,
            false,
            () => true,
            (locales) =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Stack.names),
                        project.shares.output.Stack
                    ),
                    []
                )
        ),
        new OutputProperty(
            locales.get((l) => l.output.Group.content),
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
        ...getTypeOutputProperties(project, locales),
    ];
}
