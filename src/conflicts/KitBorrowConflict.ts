import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type { Template } from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { ConflictText } from '@locale/NodeTexts';
import NodeRef from '@locale/NodeRef';
import type Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

/** What all four say: a sentence naming the kit, and the repair that removes the borrow. */
type KitBorrowLocaleAccessor = (
    locale: LocaleText,
) => ConflictText<['kit']> & { resolution: Template<[]> };

/**
 * Something wrong with a `↓ @owner/kit` (#8) — the kit is unknown, unreadable, missing its
 * version, or named at two versions in one source.
 *
 * One body for four conflicts, which differ only in the sentence they show. Two things it
 * fixes for all of them: the node is the whole borrow, so the annotation's speaker is the
 * `↓` every other conflict shows rather than a run of reference text, and so the underline
 * covers exactly what the repair removes. Which reference is wrong is said in the sentence
 * instead, where ~29 other conflicts put their code.
 */
export default abstract class KitBorrowConflict extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(ConflictSeverity.Error);
        this.borrow = borrow;
    }

    abstract getLocalePath(): KitBorrowLocaleAccessor;

    getMessage() {
        const path = this.getLocalePath();
        return {
            node: this.borrow,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize((l) => path(l).explanation, {
                    kit: new NodeRef(
                        this.borrow.external ?? this.borrow.borrow,
                        locales,
                        context,
                    ),
                }),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        const path = this.getLocalePath();
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize((l) => path(l).resolution),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.borrow, undefined],
                    ]),
                }),
            },
        ];
    }
}
