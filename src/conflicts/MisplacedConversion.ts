import type ConversionDefinition from '@nodes/ConversionDefinition';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;

    constructor(conversion: ConversionDefinition) {
        super(false);

        this.conversion = conversion;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.conversion,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) =>
                                l.node.ConversionDefinition.conflict
                                    .MisplacedConversion
                        )
                    ),
            },
        };
    }
}
