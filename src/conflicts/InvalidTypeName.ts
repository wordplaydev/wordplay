import type Context from '../nodes/Context';
import type Definition from '../nodes/Definition';
import type NameType from '../nodes/NameType';
import Stream from '../runtime/Stream';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import ValueLink from '../translation/ValueLink';
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
        return {
            primary: {
                node: this.name,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.InvalidTypeName.primary(
                        this.definition instanceof Stream
                            ? new ValueLink(
                                  this.definition,
                                  translation,
                                  context
                              )
                            : new NodeLink(
                                  this.definition,
                                  translation,
                                  context
                              )
                    ),
            },
        };
    }
}
