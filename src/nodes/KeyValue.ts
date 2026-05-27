import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import BindToken from '@nodes/BindToken';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type { Grammar, Replacement } from '@nodes/Node';
import Node, { node } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

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

    static getPossibleInsertions() {
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
                label: () => (l) => l.term.key,
                space: true,
            },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
            {
                name: 'value',
                kind: node(Expression),
                space: true,
                label: () => (l) => l.term.value,
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

    getPurpose() {
        return Purpose.Maps;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'map';
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.KeyValue;
    getLocalePath() {
        return KeyValue.LocalePath;
    }

    getCharacter() {
        return Characters.Bind;
    }
}
