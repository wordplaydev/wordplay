import type Translation from '@nodes/Translation';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class CharacterWarning extends Conflict {
    /** The node containing text */
    readonly text: Translation;

    constructor(text: Translation) {
        super(true);

        this.text = text;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.text,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Translation.conflict.character,
                    ),
            },
        };
    }
}
