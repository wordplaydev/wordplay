import type LocaleText from '@locale/LocaleText';
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

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Translation.conflict.character;

    getConflictingNodes() {
        return {
            primary: {
                node: this.text,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => CharacterWarning.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return CharacterWarning.LocalePath;
    }
}
