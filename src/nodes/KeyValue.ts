import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import BindToken from './BindToken';
import Expression from './Expression';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type { Grammar, Replacement } from './Node';
import Node, { node } from './Node';
import Sym from './Sym';
import type Token from './Token';

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

    static getPossibleReplacements() {
        return [
            KeyValue.make(
                ExpressionPlaceholder.make(),
                ExpressionPlaceholder.make(),
            ),
        ];
    }

    static getPossibleAppends() {
        return this.getPossibleReplacements();
    }

    getDescriptor(): NodeDescriptor {
        return 'KeyValue';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'key',
                kind: node(Expression),
                label: (locales: Locales) => locales.get((l) => l.term.key),
                space: true,
            },
            { name: 'bind', kind: node(Sym.Bind) },
            {
                name: 'value',
                kind: node(Expression),
                space: true,
                label: (locales: Locales) => locales.get((l) => l.term.value),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new KeyValue(
            this.replaceChild('key', this.key, replace),
            this.replaceChild('value', this.value, replace),
            this.replaceChild('bind', this.bind, replace),
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Value;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'map';
    }

    computeConflicts() {
        return [];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.KeyValue);
    }

    getCharacter() {
        return Characters.Bind;
    }
}
