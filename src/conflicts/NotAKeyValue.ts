import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type MapLiteral from '@nodes/MapLiteral';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type Locales from '../locale/Locales';

export class NotAKeyValue extends Conflict {
    readonly map: MapLiteral;
    readonly expression: Expression;

    constructor(map: MapLiteral, expression: Expression) {
        super(false);
        this.map = map;
        this.expression = expression;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.map,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.MapLiteral.conflict.NotAKeyValue.primary,
                    ),
            },
            secondary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.MapLiteral.conflict.NotAKeyValue.secondary,
                        new NodeRef(this.expression, locales, context),
                    ),
            },
        };
    }
}
