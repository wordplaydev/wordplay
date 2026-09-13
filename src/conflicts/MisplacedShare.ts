import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Token from '@nodes/Token';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

/** A `↑` somewhere it means nothing (#1373). Its text stays under `node.Bind` though all
 *  three shareable definitions raise it: moving the path would orphan three translated
 *  strings in 30 locales for a cosmetic gain. */
export class MisplacedShare extends Conflict {
    readonly definition: Bind | FunctionDefinition | StructureDefinition;
    readonly share: Token;
    constructor(
        definition: Bind | FunctionDefinition | StructureDefinition,
        share: Token,
    ) {
        super(ConflictSeverity.Error);

        this.definition = definition;
        this.share = share;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.MisplacedShare;

    getMessage() {
        return {
            node: this.definition,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MisplacedShare.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the misplaced ↑ token from the bind.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedShare.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.share, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return MisplacedShare.LocalePath;
    }
}
