import type Conditional from '../nodes/Conditional';
import type Context from '../nodes/Context';
import type Type from '../nodes/Type';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional;
    readonly type: Type;

    constructor(conditional: Conditional, type: Type) {
        super(false);

        this.conditional = conditional;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.conditional.condition,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.ExpectedBooleanCondition.primary(
                        new NodeLink(this.type, translation, context)
                    ),
            },
        };
    }
}
