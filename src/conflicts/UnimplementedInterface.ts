import type FunctionDefinition from '../nodes/FunctionDefinition';
import type StructureDefinition from '../nodes/StructureDefinition';
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
        return { primary: this.structure.names, secondary: [this.fun] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnimplementedInterface.primary({
            interface: this.interfaceStructure,
            fun: this.fun,
        });
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.UnimplementedInterface.secondary();
    }
}
