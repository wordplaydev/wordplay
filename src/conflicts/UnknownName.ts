import type Context from '@nodes/Context';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import type NameType from '../nodes/NameType';
import Reference from '../nodes/Reference';
import type Locales from '../locale/Locales';
import type Refer from '@edit/Refer';

export class UnknownName extends Conflict {
    readonly name: Reference | NameType | Token;
    readonly type: Type | undefined;

    constructor(name: Reference | NameType | Token, type: Type | undefined) {
        super(false);
        this.name = name;
        this.type = type;
    }

    getConflictingNodes(context: Context) {
        let names: Refer[] = [];
        if (this.name instanceof Reference) {
            names = Reference.getPossibleReferences(
                undefined,
                this.name,
                false,
                context,
            );
        }

        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Reference.conflict.UnknownName.conflict,
                        this.name instanceof Token
                            ? undefined
                            : new NodeRef(this.name, locales, context),
                        this.type
                            ? new NodeRef(this.type, locales, context)
                            : undefined,
                    ),
            },
            resolutions: names.map((name) => {
                return {
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                l.node.Reference.conflict.UnknownName
                                    .resolution,
                            name.definition.getPreferredName(
                                locales.getLocales(),
                            ),
                        ),
                    mediator: (context: Context, locales: Locales) => {
                        const newReference = Reference.make(
                            name.definition.getPreferredName(
                                locales.getLocales(),
                            ),
                        );
                        return {
                            newProject: context.project.withRevisedNodes([
                                [this.name, newReference],
                            ]),
                            newNode: newReference,
                        };
                    },
                };
            }),
        };
    }
}
