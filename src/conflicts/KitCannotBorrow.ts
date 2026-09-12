import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

/**
 * A `↓` in a source published as a kit (#8).
 *
 * A published source is the only file its readers get, so it can borrow nothing: another
 * kit resolves no transitive dependencies in v1, and a source left behind would resolve
 * to nothing in the borrower's project — or, worse, to a source of theirs sharing its
 * name. Either way the fix is the same, to inline what the source needs.
 *
 * Minor, like the other publishing rules: the code runs perfectly, it just can't be
 * published while the borrow is there.
 */
export default class KitCannotBorrow extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(ConflictSeverity.Minor);
        this.borrow = borrow;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Borrow.conflict.KitCannotBorrow;

    getMessage() {
        return {
            node: this.borrow,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => KitCannotBorrow.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Removing the borrow, the same repair `UnknownBorrow` offers: it is destructive,
        // but it is the only way out that lives in the code. The other way — not
        // publishing this source — lives in the dialog.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => KitCannotBorrow.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.borrow, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return KitCannotBorrow.LocalePath;
    }
}
