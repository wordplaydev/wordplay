import type Conflict from '../conflicts/Conflict';
import { UnparsableConflict } from '../conflicts/UnparsableConflict';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '../translations/Translation';
import Node, { type Replacement } from './Node';
import Type from './Type';

export default class UnparsableType extends Type {
    readonly unparsables: Node[];

    constructor(nodes: Node[]) {
        super();

        this.unparsables = nodes;
    }

    acceptsAll(): boolean {
        return false;
    }

    getNativeTypeName(): NativeTypeName {
        return 'unparsable';
    }

    getGrammar() {
        return [{ name: 'unparsables', types: [[Node]] }];
    }

    computeConflicts(): void | Conflict[] {
        return [new UnparsableConflict(this)];
    }

    clone(replace?: Replacement): this {
        return new UnparsableType(
            this.replaceChild('unparsables', this.unparsables, replace)
        ) as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.types.UnparsableType;
    }
}
