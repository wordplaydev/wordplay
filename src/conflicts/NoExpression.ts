import type LocaleText from '@locale/LocaleText';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class NoExpression extends Conflict {
    readonly def: FunctionDefinition;

    constructor(def: FunctionDefinition) {
        super(true);

        this.def = def;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.FunctionDefinition.conflict.NoExpression;

    getMessage() {
        return {
            node: this.def.names,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NoExpression.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return NoExpression.LocalePath;
    }
}
