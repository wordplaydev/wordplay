import type { NodeDescriptor } from '@locale/NodeTexts';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import AnyType from './AnyType';
import type Context from './Context';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import Type from './Type';
import type TypeSet from './TypeSet';

export const STREAM_NATIVE_TYPE_NAME = 'stream';

export default class StreamType extends Type {
    readonly stream: Token;
    readonly type: Type;

    constructor(stream: Token, type: Type) {
        super();

        this.stream = stream;
        this.type = type;

        this.computeChildren();
    }

    static make(type?: Type) {
        return new StreamType(
            new Token(STREAM_SYMBOL, Sym.Stream),
            type ?? new AnyType(),
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'stream', kind: node(Sym.Stream) },
            { name: 'type', kind: node(Type) },
        ];
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types
            .list()
            .every(
                (type) =>
                    type instanceof StreamType &&
                    this.type.accepts(type.type, context),
            );
    }

    getBasisTypeName(): BasisTypeName {
        return 'stream';
    }

    concretize(context: Context) {
        return StreamType.make(this.type.concretize(context));
    }

    clone(replace?: Replacement) {
        return new StreamType(
            this.replaceChild('stream', this.stream, replace),
            this.replaceChild('type', this.type, replace),
        ) as this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.StreamType);
    }

    getCharacter() {
        return Characters.Stream;
    }
}
