import Purpose from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import TypePlaceholder from './TypePlaceholder';
import type TypeSet from './TypeSet';

export default class ConversionType extends Type {
    readonly convert: Token;
    readonly input: Type;
    readonly output: Type;

    constructor(convert: Token, input: Type, output: Type) {
        super();

        this.convert = convert;
        this.input = input;
        this.output = output;

        this.computeChildren();
    }

    static make(input?: Type, output?: Type) {
        return new ConversionType(
            new Token(CONVERT_SYMBOL, Sym.Convert),
            input ?? TypePlaceholder.make(),
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

    getPurpose(): Purpose {
        return Purpose.Advanced;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'convert',
                kind: node(Sym.Convert),
                space: true,
                label: undefined,
            },
            {
                name: 'input',
                kind: node(Type),
                label: () => (l) => l.term.type,
            },
            {
                name: 'output',
                kind: node(Type),
                space: true,
                label: () => (l) => l.term.type,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new ConversionType(
            this.replaceChild('convert', this.convert, replace),
            this.replaceChild('input', this.input, replace),
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
