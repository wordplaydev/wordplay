import type { PermissionName } from '@input/permissions';
import type Locales from '@locale/Locales';
import type { ExceptionText } from '@locale/NodeTexts';
import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';

export default class PermissionException extends ExceptionValue {
    readonly permission: PermissionName;

    constructor(
        creator: Expression,
        evaluator: Evaluator,
        permission: PermissionName,
    ) {
        super(creator, evaluator);
        this.permission = permission;
    }

    getExceptionText(locales: Locales): ExceptionText {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.PermissionException,
        );
    }

    getExplanation(locales: Locales) {
        const label = locales.getPlainText(
            (l) => l.ui.output.permission[this.permission],
        );
        return locales.concretize(
            this.getExceptionText(locales).explanation,
            label,
        );
    }
}
