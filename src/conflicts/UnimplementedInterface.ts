import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

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
                explanation: (translation: Locale, context: Context) =>
                    concretize(
                        translation,
                        translation.conflict.UnimplementedInterface,
                        new NodeLink(
                            this.interfaceStructure,
                            translation,
                            context,
                            this.interfaceStructure.names.getLocaleText(
                                translation.language
                            )
                        ),
                        new NodeLink(
                            this.fun,
                            translation,
                            context,
                            this.fun.names.getLocaleText(translation.language)
                        )
                    ),
            },
        };
    }
}
