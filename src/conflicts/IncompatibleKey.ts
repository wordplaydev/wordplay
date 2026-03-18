import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;

    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.SetOrMapAccess.conflict.IncompatibleKey;

    getMessage() {
        return {
            node: this.access,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => IncompatibleKey.LocalePath(l).explanation,
                    new NodeRef(this.expected, locales, context),
                ),
        };
    }

    getLocalePath() {
        return IncompatibleKey.LocalePath;
    }
}
