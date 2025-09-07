import type Context from '@nodes/Context';
import type { LanguageTagged } from '@nodes/LanguageTagged';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import type { PII } from '../pii/getPII';
import getPII from '../pii/getPII';
import Conflict from './Conflict';

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
                    locales.concretize(
                        (l) => l.node.Translation.conflict[this.pii.kind],
                        this.pii.text,
                        locales.get(
                            (l) => l.node.Translation.conflict.reminder,
                        ),
                    ),
            },
            resolutions: [
                {
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) => l.node.Translation.conflict.resolution,
                        ),
                    mediator: (context: Context) => {
                        return {
                            newProject: context.project.withNonPII(
                                this.pii.text,
                            ),
                        };
                    },
                },
            ],
        };
    }
}
