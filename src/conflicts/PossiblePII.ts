import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';
import type { PII } from '../pii/getPII';
import type { LanguageTagged } from '@nodes/LanguageTagged';
import Token from '@nodes/Token';
import getPII from '../pii/getPII';
import Sym from '@nodes/Sym';
import type Context from '@nodes/Context';

export class PossiblePII extends Conflict {
    /** The node containing text */
    readonly text: Token;
    /** The possible PII in the text */
    readonly pii: PII;

    constructor(text: Token, pii: PII) {
        super(false);

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

    getConflictingNodes() {
        return {
            primary: {
                node: this.text,
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Translation.conflict[this.pii.kind],
                        ),
                        this.pii.text,
                        locales.get(
                            (l) => l.node.Translation.conflict.reminder,
                        )
                    ),
            },
            resolutions: [
                {
                    description: (locales: Locales) =>
                        concretize(
                            locales,
                            locales.get(
                                (l) => l.node.Translation.conflict.resolution,
                            ),
                        ),
                    mediator: (context: Context) => {
                        return context.project.withNonPII(this.pii.text);
                    },
                },
            ],
        };
    }
}
