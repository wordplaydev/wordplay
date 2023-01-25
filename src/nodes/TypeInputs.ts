import type Translation from '@translation/Translation';
import Node, { type Replacement } from './Node';
import Token from './Token';
import Type from './Type';

export default class TypeInputs extends Node {
    readonly open: Token;
    readonly types: Type[];
    readonly close: Token | undefined;

    constructor(open: Token, types: Type[], close: Token | undefined) {
        super();

        this.open = open;
        this.types = types;
        this.close = close;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'types', types: [[Type]] },
            { name: 'close', types: [Token, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeInputs(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    computeConflicts() {}

    getNodeTranslation(translation: Translation) {
        return translation.nodes.TypeInputs;
    }
}
