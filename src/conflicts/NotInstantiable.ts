import type LocaleText from '#locale/LocaleText.ts';
import type Evaluate from '#nodes/Evaluate.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import EvalOpenToken from '#nodes/EvalOpenToken.ts';
import EvalCloseToken from '#nodes/EvalCloseToken.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import type Expression from '#nodes/Expression.ts';

export default class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    readonly definition: StructureDefinition;
    readonly abstractFunctions: FunctionDefinition[];

    constructor(
        evaluate: Evaluate,
        definition: StructureDefinition,
        abstractFunctions: FunctionDefinition[],
    ) {
        super(ConflictSeverity.Error);

        this.evaluate = evaluate;
        this.definition = definition;
        this.abstractFunctions = abstractFunctions;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Evaluate.conflict.NotInstantiable;

    getMessage() {
        return {
            node: this.evaluate,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NotInstantiable.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Scaffold a CONCRETE body for every abstract function on the
        // structure. An `ExpressionPlaceholder` body would still be
        // abstract; the structure stays uninstantiable. Use the output
        // type's default expression when available, falling back to a
        // plain `0` so the resulting function is concrete.
        const stubs = this.abstractFunctions.map((f) => {
            const body: Expression =
                f.output?.getDefaultExpression?.(context) ??
                NumberLiteral.make(0);
            return new FunctionDefinition(
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
        });
        const existingBlock = this.definition.expression;
        // Replace the abstract function definitions in place where they
        // exist on the structure; append any remaining stubs to the block.
        const replacedStatements = (existingBlock?.statements ?? []).map(
            (s) => {
                const matchIndex = this.abstractFunctions.findIndex(
                    (f) => f === s,
                );
                return stubs[matchIndex] ?? s;
            },
        );
        const newBlock = existingBlock
            ? new Block(
                  replacedStatements,
                  existingBlock.kind,
                  existingBlock.open,
                  existingBlock.close,
                  existingBlock.docs,
              )
            : new Block(
                  stubs,
                  BlockKind.Structure,
                  EvalOpenToken(),
                  EvalCloseToken(),
              );
        const newDef = this.definition.replace('expression', newBlock);
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => NotInstantiable.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.definition, newDef],
                    ]),
                    newNode: newDef,
                }),
            },
        ];
    }

    getLocalePath() {
        return NotInstantiable.LocalePath;
    }
}
