import type Context from '../nodes/Context';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import NodeLink from '../translation/NodeLink';
import type Translation from '../translation/Translation';
import Conflict from './Conflict';

export class UnimplementedInterface extends Conflict {
    readonly structure: StructureDefinition;
    readonly interfaceStructure: StructureDefinition;
    readonly fun: FunctionDefinition;

    constructor(
        structure: StructureDefinition,
        interfaceStructure: StructureDefinition,
        fun: FunctionDefinition
    ) {
        super(false);
        this.structure = structure;
        this.interfaceStructure = interfaceStructure;
        this.fun = fun;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.structure.names,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.UnimplementedInterface.primary(
                        new NodeLink(
                            this.interfaceStructure,
                            translation,
                            context,
                            this.interfaceStructure.names.getTranslation(
                                translation.language
                            )
                        ),
                        new NodeLink(
                            this.fun,
                            translation,
                            context,
                            this.fun.names.getTranslation(translation.language)
                        )
                    ),
            },
        };
    }
}
