import { Purpose } from '#concepts/Purpose.ts';
import type Conflict from '#conflicts/Conflict.ts';
import { UnparsableConflict } from '#conflicts/UnparsableConflict.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import { list, node, type Grammar, type Replacement } from '#nodes/Node.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';

export default class UnparsableType extends Type {
    readonly unparsables: Token[];

    constructor(nodes: Token[]) {
        super();

        this.unparsables = nodes;
    }

    getDescriptor(): NodeDescriptor {
        return 'UnparsableType';
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    acceptsAll(): boolean {
        return false;
    }

    getBasisTypeName(): BasisTypeName {
        return 'unparsable';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'unparsables',
                // Tokens, which is all this ever holds — not any node. Declared as
                // any node, it made unparsable code a list anything could be
                // dragged *into*, which displaced the node itself as the drop
                // target and refused the drop that would have replaced it.
                kind: list(true, node(Token)),
                label: undefined,
            },
        ];
    }

    computeConflicts(context: Context): Conflict[] {
        // See the matching comment in UnparsableExpression.computeConflicts:
        // empty unparsables defer to siblings to avoid duplicate conflicts on
        // a single broken construct.
        if (this.unparsables.length === 0) {
            const parent = context.source.root.getParent(this);
            if (parent) {
                const allUnparsables = parent
                    .nodes()
                    .filter(
                        (n) =>
                            n instanceof UnparsableExpression ||
                            n instanceof UnparsableType,
                    );
                const someWithContent = allUnparsables.some(
                    (n) => n !== this && n.unparsables.length > 0,
                );
                if (someWithContent) return [];
                if (allUnparsables[0] !== this) return [];
            }
        }
        return [new UnparsableConflict(this, context)];
    }

    clone(replace?: Replacement): this {
        return this.cloned(
            new UnparsableType(
                this.replaceChild('unparsables', this.unparsables, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.UnparsableType;
    getLocalePath() {
        return UnparsableType.LocalePath;
    }

    getCharacter() {
        return Characters.Unparsable;
    }
}
