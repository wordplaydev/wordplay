import type LocaleText from '@locale/LocaleText';
import type This from '@nodes/This';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';

export class MisplacedThis extends Conflict {
    readonly dis: This;
    constructor(dis: This) {
        super(ConflictSeverity.Error);
        this.dis = dis;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.This.conflict.MisplacedThis;

    getMessage() {
        return {
            node: this.dis,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MisplacedThis.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Replace the misplaced `.` with a placeholder so the learner can
        // type a real value reachable in this scope.
        const placeholder = ExpressionPlaceholder.make();
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedThis.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.dis, placeholder],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return MisplacedThis.LocalePath;
    }
}
