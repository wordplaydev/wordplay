import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type TypePlaceholder from '@nodes/TypePlaceholder';
import type Locales from '../locale/Locales';
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
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) =>
                            l.node.ExpressionPlaceholder.conflict.Placeholder,
                    ),
            },
        };
    }
}
