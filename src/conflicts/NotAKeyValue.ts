import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type MapLiteral from '@nodes/MapLiteral';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class NotAKeyValue extends Conflict {
    readonly map: MapLiteral;
    readonly expression: Expression;

    constructor(map: MapLiteral, expression: Expression) {
        super(false);
        this.map = map;
        this.expression = expression;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.MapLiteral.conflict.NotAKeyValue;

    getConflictingNodes() {
        return {
            primary: {
                node: this.map,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => NotAKeyValue.LocalePath(l).primary,
                    ),
            },
            secondary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => NotAKeyValue.LocalePath(l).secondary,
                        new NodeRef(this.expression, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return NotAKeyValue.LocalePath;
    }
}
