import Type from './Type';
import type { BasisTypeName } from '../basis/BasisConstants';
import type TypeSet from './TypeSet';
import type Locale from '@locale/Locale';
import type StreamDefinition from './StreamDefinition';
import Glyphs from '../lore/Glyphs';
import { STREAM_SYMBOL } from '../parser/Symbols';
import type Spaces from '../parser/Spaces';

export default class StreamDefinitionType extends Type {
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super();

        this.definition = definition;
    }

    getGrammar() {
        return [];
    }
    computeConflicts() {
        return [];
    }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => {
            if (
                type instanceof StreamDefinitionType &&
                this.definition === type.definition
            )
                return true;
        });
    }

    simplify() {
        return new StreamDefinitionType(this.definition.withoutDocs());
    }

    getBasisTypeName(): BasisTypeName {
        return 'function';
    }

    clone() {
        return new StreamDefinitionType(this.definition) as this;
    }

    /** Mirror StreamType */
    toWordplay(_: Spaces | undefined, locale: Locale) {
        return `${STREAM_SYMBOL}${this.definition.output.toWordplay(
            _,
            locale
        )}`;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.StreamDefinitionType;
    }

    getGlyphs() {
        return Glyphs.Stream;
    }
}
