import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type { BasisTypeName } from '../basis/BasisConstants';
import Node, { list, type Grammar, type Replacement, node } from './Node';
import Type from './Type';
import Characters from '../lore/BasisCharacters';
import type Locales from '../locale/Locales';
import type Context from './Context';
import type Token from './Token';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class UnparsableType extends Type {
    readonly unparsables: Token[];

    constructor(nodes: Token[]) {
        super();

        this.unparsables = nodes;
    }

    getDescriptor(): NodeDescriptor {
        return 'UnparsableType';
    }

    acceptsAll(): boolean {
        return false;
    }

    getBasisTypeName(): BasisTypeName {
        return 'unparsable';
    }

    getGrammar(): Grammar {
        return [{ name: 'unparsables', kind: list(true, node(Node)) }];
    }

    computeConflicts(context: Context): Conflict[] {
        return [new UnparsableConflict(this, context)];
    }

    clone(replace?: Replacement): this {
        return new UnparsableType(
            this.replaceChild('unparsables', this.unparsables, replace),
        ) as this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.UnparsableType);
    }

    getCharacter() {
        return Characters.Unparsable;
    }
}
