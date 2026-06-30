import { Purpose } from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '@basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import type Context from '@nodes/Context';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import type TypeSet from '@nodes/TypeSet';

export default class ConversionType extends Type {
    readonly input: Type;
    readonly convert: Token;
    readonly output: Type;

    constructor(input: Type, convert: Token, output: Type) {
        super();

        this.input = input;
        this.convert = convert;
        this.output = output;

        this.computeChildren();
    }

    static make(input?: Type, output?: Type) {
        return new ConversionType(
            input ?? TypePlaceholder.make(),
            new Token(CONVERT_SYMBOL, Sym.Convert),
            output ?? TypePlaceholder.make(),
        );
    }

    static getPossibleReplacements() {
        return [ConversionType.make()];
    }

    static getPossibleInsertions() {
        return [ConversionType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'ConversionType';
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'input',
                kind: node(Type),
                label: () => (l) => l.glossary.type.word,
            },
            {
                name: 'convert',
                kind: node(Sym.Convert),
                space: true,
                label: undefined,
            },
            {
                name: 'output',
                kind: node(Type),
                space: true,
                label: () => (l) => l.glossary.type.word,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new ConversionType(
            this.replaceChild('input', this.input, replace),
            this.replaceChild('convert', this.convert, replace),
            this.replaceChild('output', this.output, replace),
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof ConversionType &&
                    this.input.accepts(type.input, context) &&
                    this.output instanceof Type &&
                    type.output instanceof Type &&
                    this.output.accepts(type.output, context),
            );
    }

    concretize(context: Context) {
        return ConversionType.make(
            this.input.concretize(context),
            this.output.concretize(context),
        );
    }

    getBasisTypeName(): BasisTypeName {
        return 'conversion';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.ConversionType;
    getLocalePath() {
        return ConversionType.LocalePath;
    }

    getCharacter() {
        return Characters.Conversion;
    }
}
