import type LocaleText from '@locale/LocaleText';
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

    getMessage() {
        return {
            node: this.expression,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NotAKeyValue.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return NotAKeyValue.LocalePath;
    }
}
