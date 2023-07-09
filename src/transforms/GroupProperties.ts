import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import type Expression from '../nodes/Expression';
import ListLiteral from '../nodes/ListLiteral';
import Reference from '../nodes/Reference';
import type OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';

export default function getGroupProperties(project: Project): OutputProperty[] {
    return [
        {
            name: 'layout',
            type: new OutputPropertyOptions(
                [project.shares.output.row, project.shares.output.stack].map(
                    (type) => `${type.names.getNames()[0]}`
                ),
                false,
                (text: string) => Evaluate.make(Reference.make(text), []),
                (expression: Expression | undefined) =>
                    expression instanceof Evaluate
                        ? expression.func.toWordplay()
                        : undefined
            ),
            required: true,
            inherited: false,
            editable: () => true,
            create: (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.stack.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.stack
                    ),
                    []
                ),
        },
        {
            name: 'content',
            type: 'content',
            required: true,
            inherited: false,
            editable: (expr) => expr instanceof ListLiteral,
            create: () => ListLiteral.make([]),
        },
    ];
}
