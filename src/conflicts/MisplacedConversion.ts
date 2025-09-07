import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

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
                    locales.concretize(
                        (l) =>
                            l.node.ConversionDefinition.conflict
                                .MisplacedConversion,
                    ),
            },
        };
    }
}
