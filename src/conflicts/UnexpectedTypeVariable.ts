import type LocaleText from '@locale/LocaleText';
import type Reference from '@nodes/Reference';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.UnexpectedTypeVariable;

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnexpectedTypeVariable.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return UnexpectedTypeVariable.LocalePath;
    }
}
