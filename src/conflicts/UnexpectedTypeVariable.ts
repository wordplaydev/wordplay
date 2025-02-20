import type Reference from '@nodes/Reference';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Reference.conflict.UnexpectedTypeVariable,
                    ),
            },
        };
    }
}
