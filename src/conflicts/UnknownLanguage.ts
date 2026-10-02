import type LocaleText from '#locale/LocaleText.ts';
import type Language from '#nodes/Language.ts';
import type Token from '#nodes/Token.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class UnknownLanguage extends Conflict {
    readonly language: Language;
    readonly code: Token;

    constructor(language: Language, code: Token) {
        super(ConflictSeverity.Minor);
        this.language = language;
        this.code = code;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Language.conflict.UnknownLanguage;

    getMessage() {
        return {
            node: this.language,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnknownLanguage.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the unknown language code token.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownLanguage.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.code, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return UnknownLanguage.LocalePath;
    }
}
