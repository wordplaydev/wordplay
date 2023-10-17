import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type TypePlaceholder from '@nodes/TypePlaceholder';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.ExpressionPlaceholder.conflict
                                    .Placeholder
                        )
                    ),
            },
        };
    }
}
