import type StructureDefinition from '../nodes/StructureDefinition';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import type Evaluation from './Evaluation';
import Primitive from './Primitive';
import type Value from './Value';
import type Node from '../nodes/Node';
import { TYPE_SYMBOL } from '../parser/Tokenizer';
import type LanguageCode from '../nodes/LanguageCode';
import type { NativeTypeName } from '../native/NativeConstants';

export default class StructureDefinitionValue extends Primitive {
    /** The definition from the AST. */
    readonly definition: StructureDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | undefined;

    constructor(
        creator: Node,
        definition: StructureDefinition,
        context?: Evaluation
    ) {
        super(creator);

        this.definition = definition;
        this.context = context;
    }

    getType() {
        return new StructureDefinitionType(this.definition, []);
    }

    getNativeTypeName(): NativeTypeName {
        return 'structure';
    }

    toWordplay(languages: LanguageCode[]) {
        return `${TYPE_SYMBOL}${this.definition.names.getTranslation(
            languages
        )}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StructureDefinitionValue &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }
}
