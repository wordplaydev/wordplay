import type { PermissionName } from '#input/permissions.ts';
import type Locales from '#locale/Locales.ts';
import type { ExceptionText } from '#locale/NodeTexts.ts';
import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';

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

    getExceptionText(locales: Locales): ExceptionText<[], ['permission']> {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.PermissionException,
        );
    }

    getExplanation(locales: Locales) {
        const label = locales.getPlainText(
            (l) => l.ui.output.permission[this.permission],
        );
        return locales.concretize(
            (l) => l.node.Program.exception.PermissionException.explanation,
            { permission: label },
        );
    }
}
