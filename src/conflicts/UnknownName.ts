import type Refer from '@edit/revision/Refer';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import type NameType from '@nodes/NameType';
import Reference from '@nodes/Reference';
import Conflict, { type Repair, type Resolutions } from '@conflicts/Conflict';
import levenshtein from '@util/levenshtein';

export class UnknownName extends Conflict {
    readonly name: Reference | NameType | Token;
    readonly type: Type | undefined;

    constructor(name: Reference | NameType | Token, type: Type | undefined) {
        super(false);
        this.name = name;
        this.type = type;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.UnknownName.conflict;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnknownName.LocalePath(l).explanation,
                    {
                        name:
                            this.name instanceof Token
                                ? undefined
                                : new NodeRef(this.name, locales, context),
                        scope: this.type
                            ? new NodeRef(this.type, locales, context)
                            : undefined,
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        let names: Refer[] = [];
        if (this.name instanceof Reference) {
            names = Reference.getPossibleReferences(
                undefined,
                this.name,
                false,
                context,
            );

            const userInput: string = this.name.name.text.text;
            const maxNames: number = 50;
            names.splice(maxNames);

            for (let i = names.length - 1; i >= 0; i--) {
                const currName: string =
                    names[i].definition.names.names[0].name.text.text;

                if (levenshtein(userInput, currName) > 1) {
                    names.splice(i, 1);
                }
            }
        }

        const repairs: Repair[] = names.map((name) => ({
            kind: 'repair',
            description: (locales: Locales) =>
                locales.concretize(
                    (l) => l.node.Reference.conflict.UnknownName.resolution,
                    {
                        suggestion: name.definition.getPreferredName(
                            locales.getLocales(),
                        ),
                    },
                ),
            mediator: (context: Context, locales: Locales) => {
                const newReference = Reference.make(
                    name.definition.getPreferredName(locales.getLocales()),
                );
                return {
                    newProject: context.project.withRevisedNodes([
                        [this.name, newReference],
                    ]),
                    newNode: newReference,
                };
            },
        }));

        // No similar name in scope? Fall back to the synthesised explainer
        // (re-states the primary message and focuses the offending name).
        return repairs.length === 0
            ? Conflict.fallbackExplainer(this, context, concepts)
            : (repairs as readonly Repair[] as Resolutions);
    }

    getLocalePath() {
        return UnknownName.LocalePath;
    }
}
