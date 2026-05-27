import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '@basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import type Context from '@nodes/Context';
import Node, { list, node, type Grammar, type Replacement } from '@nodes/Node';
import type Token from '@nodes/Token';
import Type from '@nodes/Type';
import UnparsableExpression from '@nodes/UnparsableExpression';

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
                kind: list(true, node(Node)),
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
        return new UnparsableType(
            this.replaceChild('unparsables', this.unparsables, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.UnparsableType;
    getLocalePath() {
        return UnparsableType.LocalePath;
    }

    getCharacter() {
        return Characters.Unparsable;
    }
}
