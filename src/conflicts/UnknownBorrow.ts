import type LocaleText from '@locale/LocaleText';
import type Borrow from '@nodes/Borrow';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class UnknownBorrow extends Conflict {
    readonly borrow: Borrow;

    constructor(borrow: Borrow) {
        super(false);

        this.borrow = borrow;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Borrow.conflict.UnknownBorrow;

    getConflictingNodes() {
        return {
            primary: {
                node:
                    this.borrow.source === undefined
                        ? this.borrow.borrow
                        : this.borrow.source,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownBorrow.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return UnknownBorrow.LocalePath;
    }
}
