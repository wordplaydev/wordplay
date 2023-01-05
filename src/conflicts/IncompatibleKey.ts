import type SetOrMapAccess from '../nodes/SetOrMapAccess';
import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
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

    getConflictingNodes() {
        return { primary: this.access.key, secondary: [this.expected] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleKey.primary({
            expected: this.expected,
            received: this.received,
        });
    }

    getSecondaryExplanation(translation: Translation) {
        return translation.conflict.IncompatibleKey.secondary();
    }
}
