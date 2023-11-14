import type Conflict from '@conflicts/Conflict';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import type { BasisTypeName } from '../basis/BasisConstants';
import Node, { list, type Grammar, type Replacement, node } from './Node';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import type Locales from '../locale/Locales';

export default class UnparsableType extends Type {
    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    getDescriptor() {
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

    computeConflicts(): void | Conflict[] {
        return [new UnparsableConflict(this)];
    }

    clone(replace?: Replacement): this {
        return new UnparsableType(
            this.replaceChild('unparsables', this.unparsables, replace)
        ) as this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.UnparsableType);
    }

    getGlyphs() {
        return Glyphs.Unparsable;
    }
}
