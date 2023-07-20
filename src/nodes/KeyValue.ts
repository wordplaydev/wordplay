import Expression from './Expression';
import type { Grammar, Replacement } from './Node';
import type Token from './Token';
import BindToken from './BindToken';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import Node, { node } from './Node';
import Symbol from './Symbol';
import ExpressionPlaceholder from './ExpressionPlaceholder';

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

    static getPossibleNodes() {
        return [
            KeyValue.make(
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make()
            ),
        ];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'key',
                types: node(Expression),
                label: (translation: Locale) => translation.term.key,
            },
            { name: 'bind', types: node(Symbol.Bind) },
            {
                name: 'value',
                types: node(Expression),
                label: (translation: Locale) => translation.term.value,
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
        return Purpose.Value;
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
