import type Context from '../nodes/Context';
import type Definition from '../nodes/Definition';
import type NameType from '../nodes/NameType';
import Stream from '../runtime/Stream';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import ValueLink from '../translations/ValueLink';
import Conflict from './Conflict';

export class UnknownTypeName extends Conflict {
    readonly name: NameType;
    readonly definition: Definition;

    constructor(name: NameType, definition: Definition) {
        super(false);
        this.name = name;
        this.definition = definition;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnknownTypeName.primary(
            this.definition instanceof Stream
                ? new ValueLink(this.definition, translation, context)
                : new NodeLink(this.definition, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
