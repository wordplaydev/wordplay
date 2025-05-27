import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnimplementedInterface extends Conflict {
    readonly structure: StructureDefinition;
    readonly interfaceStructure: StructureDefinition;
    readonly fun: FunctionDefinition;

    constructor(
        structure: StructureDefinition,
        interfaceStructure: StructureDefinition,
        fun: FunctionDefinition,
    ) {
        super(false);
        this.structure = structure;
        this.interfaceStructure = interfaceStructure;
        this.fun = fun;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.StructureDefinition.conflict.UnimplementedInterface;

    getConflictingNodes() {
        return {
            primary: {
                node: this.structure,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnimplementedInterface.LocalePath(l).primary,
                        new NodeRef(
                            this.interfaceStructure,
                            locales,
                            context,
                            locales.getName(this.interfaceStructure.names),
                        ),
                        new NodeRef(
                            this.fun,
                            locales,
                            context,
                            locales.getName(this.fun.names),
                        ),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnimplementedInterface.LocalePath;
    }
}
