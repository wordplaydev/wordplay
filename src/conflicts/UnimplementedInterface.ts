import type Context from '../nodes/Context';
import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
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
        return { primary: this.structure.names, secondary: this.fun };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.UnimplementedInterface.primary(
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
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
