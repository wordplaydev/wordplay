import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import NodeRef from '@locale/NodeRef';
import type Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';

/**
 * Two borrows put the same name in a source's scope (#1373).
 *
 * Silent before this: `Program.getDefinitions` concatenates every borrow's definitions and
 * lookup takes the first that matches, so a creator borrowing two kits that both share a
 * `sunset` got one of them with nothing said about the other. The names in a borrowed kit
 * come from someone who has never seen the borrowing program, so this is not a collision
 * either author can avoid.
 *
 * `Minor`, like `DuplicateName`, which is the same defect one scope down: the program runs,
 * it may just not run on the value its author meant.
 */
export default class DuplicateBorrow extends Conflict {
    readonly borrow: Borrow;
    /** The name both borrows bind. */
    readonly name: string;
    /** A name free of every earlier borrow, for the repair to alias this one as. */
    readonly free: string;

    constructor(borrow: Borrow, name: string, free: string) {
        super(ConflictSeverity.Minor);

        this.borrow = borrow;
        this.name = name;
        this.free = free;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Borrow.conflict.DuplicateBorrow;

    getMessage() {
        return {
            node: this.borrow,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => DuplicateBorrow.LocalePath(l).explanation,
                    {
                        name: new NodeRef(
                            this.borrow.external ?? this.borrow.borrow,
                            locales,
                            context,
                        ),
                    },
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => DuplicateBorrow.LocalePath(l).resolution,
                        { name: this.free },
                    ),
                // Naming the kit is the repair because an aliased borrow binds *only* the
                // namespace: the names that collided never enter scope, and what this
                // borrow offers is still reachable, through the name it was just given.
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [
                            this.borrow,
                            this.borrow.withAlias(Reference.make(this.free)),
                        ],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return DuplicateBorrow.LocalePath;
    }
}
