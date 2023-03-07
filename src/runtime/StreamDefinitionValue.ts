import Primitive from './Primitive';
import type Value from './Value';
import { STREAM_SYMBOL } from '@parser/Symbols';
import type LanguageCode from '@translation/LanguageCode';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '@translation/Translation';
import type StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';

export default class StreamDefinitionValue extends Primitive {
    /** The definition from the AST. */
    readonly definition: StreamDefinition;

    constructor(definition: StreamDefinition) {
        super(definition);

        this.definition = definition;
    }

    getType() {
        return StreamType.make(this.definition.output);
    }

    getNativeTypeName(): NativeTypeName {
        return 'streamdefinition';
    }

    toWordplay(languages: LanguageCode[]) {
        return `${STREAM_SYMBOL}${this.definition.names.getTranslation(
            languages
        )}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StreamDefinitionValue &&
            this.definition === value.definition
        );
    }

    getDescription(translation: Translation) {
        return translation.data.function;
    }

    getSize() {
        return 1;
    }
}
