import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

export default class IncompatibleBind extends Conflict {
    readonly expectedType: Type;
    readonly value: Expression;
    readonly givenType: Type;

    constructor(expectedType: Type, value: Expression, givenType: Type) {
        super(false);

        this.expectedType = expectedType;
        this.value = value;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.value,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.IncompatibleBind.primary,
                        new NodeLink(this.expectedType, locale, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.IncompatibleBind.secondary,
                        new NodeLink(this.givenType, locale, context),
                        new NodeLink(this.expectedType, locale, context)
                    ),
            },
        };
    }
}
