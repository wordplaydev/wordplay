import type LocaleText from '@locale/LocaleText';
import Translation from '@nodes/Translation';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import { ConceptRegExPattern } from '@parser/Tokenizer';

export class CharacterWarning extends Conflict {
    /** The node containing text */
    readonly text: Translation;

    constructor(text: Translation) {
        super(ConflictSeverity.Minor);

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

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Strip the concept-link sequences (e.g. `@Phrase`) out of the
        // translation's text — they're the characters the warning is about.
        const pattern = new RegExp(ConceptRegExPattern, 'ug');
        const cleaned = Translation.make(
            this.text.getText().replace(pattern, ''),
            this.text.language,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => CharacterWarning.LocalePath(l).resolutionStrip,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.text, cleaned],
                    ]),
                    newNode: cleaned,
                }),
            },
        ];
    }

    getLocalePath() {
        return CharacterWarning.LocalePath;
    }
}
