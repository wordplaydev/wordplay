import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import Block, { BlockKind } from '@nodes/Block';
import EvalOpenToken from '@nodes/EvalOpenToken';
import EvalCloseToken from '@nodes/EvalCloseToken';
import NumberLiteral from '@nodes/NumberLiteral';

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

    getMessage() {
        return {
            node: this.structure,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnimplementedInterface.LocalePath(l).explanation,
                    {
                        interface: new NodeRef(
                        this.interfaceStructure,
                        locales,
                        context,
                        locales.getName(this.interfaceStructure.names),
                    ),
                        function: new NodeRef(
                        this.fun,
                        locales,
                        context,
                        locales.getName(this.fun.names),
                    ),
                    },
                ),
        };
    }

    override getResolutions(
        context: Context,
        _concepts: Node[],
    ): Resolutions {
        // Scaffold a CONCRETE stub of `this.fun` on `this.structure`. The
        // body must not be an ExpressionPlaceholder — that'd leave the new
        // function abstract, so the implements check still fails. Use the
        // declared output type's default if any, otherwise `0`.
        const f = this.fun;
        const body =
            f.output?.getDefaultExpression?.(context) ?? NumberLiteral.make(0);
        const stub = new FunctionDefinition(
            f.docs,
            f.share,
            f.fun,
            f.names,
            f.types,
            f.open,
            f.inputs,
            f.close,
            f.dot,
            f.output,
            body,
        );
        const existingBlock = this.structure.expression;
        const newBlock = existingBlock
            ? new Block(
                  [...existingBlock.statements, stub],
                  existingBlock.kind,
                  existingBlock.open,
                  existingBlock.close,
                  existingBlock.docs,
              )
            : new Block(
                  [stub],
                  BlockKind.Structure,
                  new EvalOpenToken(),
                  new EvalCloseToken(),
              );
        const newStructure = this.structure.replace('expression', newBlock);
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnimplementedInterface.LocalePath(l).resolution,
                        {
                            function: new NodeRef(
                                this.fun,
                                locales,
                                context,
                                locales.getName(this.fun.names),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.structure, newStructure],
                    ]),
                    newNode: stub,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnimplementedInterface.LocalePath;
    }
}
