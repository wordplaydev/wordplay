import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import type Reaction from '../nodes/Reaction';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export default class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional | Reaction;
    readonly type: Type;

    constructor(conditional: Conditional | Reaction, type: Type) {
        super(false);

        this.conditional = conditional;
        this.type = type;
    }

    getConflictingNodes() {
        return {
            primary: {
                node:
                    this.conditional instanceof Conditional
                        ? this.conditional.question
                        : this.conditional.dots,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.ExpectedBooleanCondition.primary,
                        new NodeLink(this.type, locale, context)
                    ),
            },
            secondary: {
                node: this.conditional.condition,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.ExpectedBooleanCondition.secondary,
                        new NodeLink(this.type, locale, context)
                    ),
            },
        };
    }
}
