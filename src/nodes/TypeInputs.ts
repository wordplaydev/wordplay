import type { TemplateInput } from '@locale/Locales';
import type Locales from '@locale/Locales';
import type Context from './Context';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '@parser/Symbols';
import type { Grammar, Replacement } from '@nodes/Node';
import Node, { list, node, optional } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Type from '@nodes/Type';

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

    static make(types?: Type[]) {
        return new TypeInputs(
            new Token(TYPE_OPEN_SYMBOL, Sym.TypeOpen),
            types ?? [],
            new Token(TYPE_CLOSE_SYMBOL, Sym.TypeClose),
        );
    }

    /** Never offered as a replacement: a bare ⸨⸩ just segments its types. */
    static getPossibleReplacements() {
        return [];
    }

    /** Assigned into an evaluation's types field with one starter placeholder, so the container
     * appears only implicitly, populated — never as a bare pair of delimiters. */
    static getPossibleInsertions() {
        return [TypeInputs.make([TypePlaceholder.make()])];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypeInputs';
    }

    getPurpose() {
        // A segmenting container: it only groups its types, so it is never offered as a concept
        // itself — creators add TypeInputs implicitly via an evaluation's types field.
        return Purpose.Hidden;
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TypeOpen), label: undefined },
            {
                name: 'types',
                kind: list(true, node(Type)),
                label: () => (l) => l.glossary.type.word,
            },
            {
                name: 'close',
                kind: optional(node(Sym.TypeClose)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new TypeInputs(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('types', this.types, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TypeInputs;
    getLocalePath() {
        return TypeInputs.LocalePath;
    }

    getDescriptionInputs(
        _: Locales,
        __: Context,
    ): Record<string, TemplateInput> {
        return {
            count: this.types.length,
        };
    }

    getCharacter() {
        return Characters.Type;
    }
}
