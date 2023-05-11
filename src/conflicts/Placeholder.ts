import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type TypePlaceholder from '@nodes/TypePlaceholder';
import type Locale from '@translation/Locale';
import Conflict from './Conflict';

export default class Placeholder extends Conflict {
    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;

    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(true);
        this.placeholder = placeholder;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.placeholder,
                explanation: (translation: Locale) =>
                    translation.conflict.Placeholder.primary,
            },
        };
    }
}
