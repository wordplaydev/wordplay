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

    getMessage() {
        return {
            node: this.text,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => CharacterWarning.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return CharacterWarning.LocalePath;
    }
}
