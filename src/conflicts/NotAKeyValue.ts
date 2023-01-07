import type Context from '../nodes/Context';
import type Expression from '../nodes/Expression';
import type MapLiteral from '../nodes/MapLiteral';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

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
            primary: this.expression,
            secondary: this.map.open,
        };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.NotAMap.primary;
    }

    getSecondaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.NotAMap.secondary(
            new NodeLink(this.expression, translation, context)
        );
    }
}
