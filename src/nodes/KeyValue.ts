import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Locales from '#locale/Locales.ts';
import type Context from './Context';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import BindToken from '#nodes/BindToken.ts';
import Expression from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import Node, { node } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

export default class KeyValue extends Node {
    readonly key: Expression;
    readonly bind: Token;
    readonly value: Expression;

    constructor(key: Expression, value: Expression, bind?: Token) {
        super();

        this.key = key;
        this.bind = bind ?? BindToken();
        this.value = value;

        this.computeChildren();
    }

    static make(key: Expression, value: Expression) {
        return new KeyValue(key, value, BindToken());
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
                label: () => (l) => l.glossary.key.word,
                space: true,
            },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
            {
                name: 'value',
                kind: node(Expression),
                space: true,
                label: () => (l) => l.glossary.value.word,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new KeyValue(
                this.replaceChild('key', this.key, replace),
                this.replaceChild('value', this.value, replace),
                this.replaceChild('bind', this.bind, replace),
            ),
        );
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

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            key: conciseRef(this.key, locales, context),
            value: conciseRef(this.value, locales, context),
        };
    }

    getCharacter() {
        return Characters.Bind;
    }
}
