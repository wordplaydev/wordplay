import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type NameType from '@nodes/NameType';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.NameType.conflict.UnknownTypeName
                        ),
                        new NodeRef(this.definition, locales, context)
                    ),
            },
        };
    }
}
