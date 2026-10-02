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

export default class MissingLanguage extends Conflict {
    readonly language: Language;
    readonly slash: Token;

    constructor(language: Language, slash: Token) {
        super(ConflictSeverity.Error);
        this.language = language;
        this.slash = slash;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Language.conflict.MissingLanguage;

    getMessage() {
        return {
            node: this.language,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MissingLanguage.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the entire empty language tag (the parent Language node).
        // Just removing the slash leaves an orphaned tag wrapper; removing
        // the Language drops the slash and anything else attached.
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => MissingLanguage.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.language, undefined],
                    ]),
                }),
            },
        ];
    }

    getLocalePath() {
        return MissingLanguage.LocalePath;
    }
}
