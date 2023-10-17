import Conflict from './Conflict';
import type Type from '@nodes/Type';
import type Is from '@nodes/Is';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export class ImpossibleType extends Conflict {
    readonly is: Is;
    readonly givenType: Type;

    constructor(is: Is, givenType: Type) {
        super(false);
        this.is = is;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.is,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get((l) => l.node.Is.conflict.ImpossibleType)
                    ),
            },
        };
    }
}
