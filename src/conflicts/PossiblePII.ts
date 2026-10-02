import type LocaleText from '#locale/LocaleText.ts';
import type Context from '#nodes/Context.ts';
import type { LanguageTagged } from '#nodes/LanguageTagged.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Locales from '#locale/Locales.ts';
import type { PII } from '../pii/getPII';
import getPII from '../pii/getPII';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';

export class PossiblePII extends Conflict {
    /** The node containing text */
    readonly text: Token;
    /** The possible PII in the text */
    readonly pii: PII;

    constructor(text: Token, pii: PII) {
        super(ConflictSeverity.Minor);

        this.text = text;
        this.pii = pii;
    }

    static analyze(node: LanguageTagged, context: Context): PossiblePII[] {
        return node
            .nodes()
            .filter(
                (s): s is Token => s instanceof Token && s.isSymbol(Sym.Words),
            )
            .map((t) =>
                getPII(t.getText())
                    .filter((pii) => !context.project.isNotPII(pii.text))
                    .map((pii) => new PossiblePII(t, pii)),
            )
            .flat();
    }

    getMessage() {
        return {
            node: this.text,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) =>
                        l.node.Translation.conflict[this.pii.kind].explanation,
                    {
                        text: this.pii.text,
                        reminder: locales.getMultilingualText(
                            (l) => l.node.Translation.conflict.reminder,
                        ),
                    },
                ),
        };
    }

    override getResolutions(): Resolutions {
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Translation.conflict.resolution,
                    ),
                mediator: (context: Context) => {
                    return {
                        newProject: context.project.withNonPII(this.pii.text),
                    };
                },
            },
        ];
    }

    getLocalePath() {
        return (locale: LocaleText) =>
            locale.node.Translation.conflict[this.pii.kind];
    }
}
