import type LocaleText from '@locale/LocaleText';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Block from '@nodes/Block';

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;

    constructor(conversion: ConversionDefinition) {
        super(ConflictSeverity.Error);

        this.conversion = conversion;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.ConversionDefinition.conflict.MisplacedConversion;

    getMessage() {
        return {
            node: this.conversion,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MisplacedConversion.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Remove the misplaced ConversionDefinition. If its parent is a
        // Block (top-level position), just drop it; otherwise it occupies an
        // expression slot, so replace with a placeholder.
        const parent = context.source.root.getParent(this.conversion);
        const inBlock = parent instanceof Block;
        const placeholder = ExpressionPlaceholder.make();
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedConversion.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.conversion, inBlock ? undefined : placeholder],
                    ]),
                    ...(inBlock ? {} : { newNode: placeholder }),
                }),
            },
        ];
    }

    getLocalePath() {
        return MisplacedConversion.LocalePath;
    }
}
