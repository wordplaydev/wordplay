import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';
import type PropertyBind from '@nodes/PropertyBind';
import type StructureDefinition from '@nodes/StructureDefinition';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';

export default class InvalidProperty extends Conflict {
    readonly definition: StructureDefinition;
    readonly refine: PropertyBind;

    constructor(definition: StructureDefinition, refine: PropertyBind) {
        super(false);

        this.definition = definition;
        this.refine = refine;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.refine.reference,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.PropertyBind.conflict.InvalidProperty
                                    .primary,
                        ),
                        new NodeRef(this.definition.names, locales, context),
                    ),
            },
            secondary: {
                node: this.definition.names,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.PropertyBind.conflict.InvalidProperty
                                    .secondary,
                        ),
                        new NodeRef(
                            this.refine.reference.name ?? this.refine.reference,
                            locales,
                            context,
                        ),
                    ),
            },
        };
    }
}
