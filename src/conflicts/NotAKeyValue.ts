import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type MapLiteral from '@nodes/MapLiteral';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                node: this.expression,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.NotAMap.primary),
            },
            secondary: {
                node: this.map.open,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.NotAMap.secondary,
                        new NodeLink(this.expression, locale, context)
                    ),
            },
        };
    }
}
