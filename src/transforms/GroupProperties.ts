import Evaluate from '../nodes/Evaluate';
import type Expression from '../nodes/Expression';
import ListLiteral from '../nodes/ListLiteral';
import Reference from '../nodes/Reference';
import { RowType } from '../output/Row';
import { StackType } from '../output/Stack';
import type OutputProperty from './OutputProperty';
import OutputPropertyOptions from './OutputPropertyOptions';

const GroupProperties: OutputProperty[] = [
    {
        name: 'layout',
        type: new OutputPropertyOptions(
            [RowType, StackType].map((type) => `${type.names.getNames()[0]}`),
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
                    StackType.names.getLocaleText(languages),
                    StackType
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

export default GroupProperties;
