import type Reference from '@nodes/Reference';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.Reference.conflict.UnexpectedTypeVariable
                        )
                    ),
            },
        };
    }
}
