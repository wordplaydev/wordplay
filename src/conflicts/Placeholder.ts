import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type TypePlaceholder from '@nodes/TypePlaceholder';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/locales/concretize';

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
                    concretize(translation, translation.conflict.Placeholder),
            },
        };
    }
}
