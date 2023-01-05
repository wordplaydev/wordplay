import Expression from './Expression';
import Node, { type Replacement } from './Node';
import Token from './Token';
import BindToken from './BindToken';
import type Translation from '../translations/Translation';

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
            {
                name: 'key',
                types: [Expression],
                label: (translation: Translation) => translation.data.key,
            },
            { name: 'bind', types: [Token] },
            {
                name: 'value',
                types: [Expression],
                label: (translation: Translation) => translation.data.value,
            },
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

    getDescription(translation: Translation) {
        return translation.nodes.KeyValue.description;
    }
}
