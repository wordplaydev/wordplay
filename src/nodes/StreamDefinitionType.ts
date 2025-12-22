import Purpose from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import type Spaces from '../parser/Spaces';
import { STREAM_SYMBOL } from '../parser/Symbols';
import type StreamDefinition from './StreamDefinition';
import Type from './Type';
import type TypeSet from './TypeSet';

export default class StreamDefinitionType extends Type {
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super();

        this.definition = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'StreamDefinitionType';
    }

    getPurpose(): Purpose {
        return Purpose.Hidden;
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
        return 'streamdefinition';
    }

    clone() {
        return new StreamDefinitionType(this.definition) as this;
    }

    /** Mirror StreamType */
    toWordplay(_: Spaces | undefined) {
        return `${STREAM_SYMBOL}${this.definition.output.toWordplay(_)}`;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.StreamDefinitionType;
    getLocalePath() {
        return StreamDefinitionType.LocalePath;
    }

    getCharacter() {
        return Characters.Stream;
    }
}
