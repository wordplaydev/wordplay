import UnknownType from './UnknownType';
import type Token from './Token';
import type Node from './Node';
import type Type from './Type';
import type Translation from '../translations/Translation';
import type Context from './Context';

export default class UnknownNameType extends UnknownType<Node> {
    readonly name: Token | undefined;

    constructor(
        expression: Node,
        name: Token | undefined,
        why: Type | undefined
    ) {
        super(expression, why);

        this.name = name;
    }

    getReason(translation: Translation, context: Context) {
        return translation.types.UnknownNameType.description(
            this,
            translation,
            context
        );
    }
}
