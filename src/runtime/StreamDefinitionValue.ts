import Simple from './Simple';
import type Value from './Value';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import type StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import concretize from '../locale/concretize';

export default class StreamDefinitionValue extends Simple {
    /** The definition from the AST. */
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super(definition);

        this.definition = definition;
    }

    getType() {
        return StreamType.make(this.definition.output);
    }

    getBasisTypeName(): BasisTypeName {
        return 'streamdefinition';
    }

    toWordplay(locales: Locale[]) {
        return `${STREAM_SYMBOL}${this.definition.names.getPreferredNameString(
            locales
        )}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StreamDefinitionValue &&
            this.definition === value.definition
        );
    }

    getDescription(translation: Locale) {
        return concretize(translation, translation.term.function);
    }

    getSize() {
        return 1;
    }
}
