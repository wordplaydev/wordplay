import Expression from './Expression';
import Node, { type Replacement } from './Node';
import Token from './Token';
import BindToken from './BindToken';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';

export default class KeyValue extends Node {
    readonly key: Expression;
    readonly bind: Token;
    readonly value: Expression;

    constructor(key: Expression, value: Expression, bind?: Token) {
        super();

        this.key = key;
        this.bind = bind ?? new BindToken();
        this.value = value;

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'key', types: [Expression] },
            { name: 'bind', types: [Token] },
            { name: 'value', types: [Expression] },
        ];
    }

    clone(replace?: Replacement) {
        return new KeyValue(
            this.replaceChild('key', this.key, replace),
            this.replaceChild('value', this.value, replace),
            this.replaceChild('bind', this.bind, replace)
        ) as this;
    }

    computeConflicts() {}

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A map key/value pair.',
        };
    }
}
