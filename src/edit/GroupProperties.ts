import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import type Expression from '../nodes/Expression';
import ListLiteral from '../nodes/ListLiteral';
import Reference from '../nodes/Reference';
import OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';

export default function getGroupProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Group.layout,
            new OutputPropertyOptions(
                [project.shares.output.row, project.shares.output.stack].map(
                    (type) => `${type.names.getNames()[0]}`
                ),
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
            (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.stack.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.stack
                    ),
                    []
                )
        ),
        new OutputProperty(
            locale.output.Group.content,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
    ];
}
