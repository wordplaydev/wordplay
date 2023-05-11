import Expression from './Expression';
import Node, { type Replacement } from './Node';
import Token from './Token';
import BindToken from './BindToken';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

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

    static make(key: Expression, value: Expression) {
        return new KeyValue(key, value, new BindToken());
    }

    getGrammar() {
        return [
            {
                name: 'key',
                types: [Expression],
                label: (translation: Locale) => translation.data.key,
            },
            { name: 'bind', types: [Token] },
            {
                name: 'value',
                types: [Expression],
                label: (translation: Locale) => translation.data.value,
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

    getPurpose(): Purpose {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'map';
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.KeyValue;
    }

    getGlyphs() {
        return Glyphs.Bind;
    }
}
