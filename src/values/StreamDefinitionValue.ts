import SimpleValue from './SimpleValue';
import type Value from '@values/Value';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class StreamDefinitionValue extends SimpleValue {
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

    toWordplay(locales?: Locales) {
        return `${STREAM_SYMBOL}${
            locales
                ? locales.getName(this.definition.names)
                : this.definition.names.getNames()[0]
        }`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StreamDefinitionValue &&
            this.definition === value.definition
        );
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.function)
        );
    }

    getRepresentativeText(locales: Locales) {
        return this.definition.getPreferredName(locales.getLocales());
    }

    getSize() {
        return 1;
    }
}
