import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type PropertyBind from '../nodes/PropertyBind';
import type Bind from '../nodes/Bind';

export default class IncompatibleBind extends Conflict {
    readonly bind: Bind | PropertyBind;
    readonly expectedType: Type;
    readonly value: Expression;
    readonly givenType: Type;

    constructor(
        bind: Bind | PropertyBind,
        expectedType: Type,
        value: Expression,
        givenType: Type
    ) {
        super(false);

        this.bind = bind;
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
                        locale.node.Bind.conflict.IncompatibleBind.primary,
                        new NodeRef(this.expectedType, locale, context)
                    ),
            },
            secondary: {
                node: this.expectedType,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.IncompatibleBind.secondary,
                        new NodeRef(this.givenType, locale, context),
                        new NodeRef(this.expectedType, locale, context)
                    ),
            },
        };
    }
}
